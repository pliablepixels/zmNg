import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { useProfileStore } from '../stores/profile';
import { getVersion } from '../api/auth';
import { createApiClient, setApiClient } from '../api/client';
import { Video, Server, ShieldCheck, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Setup() {
  const navigate = useNavigate();
  const addProfile = useProfileStore((state) => state.addProfile);
  const currentProfile = useProfileStore((state) => state.currentProfile());

  // Initialize with current profile data if available, otherwise use defaults
  // Use lazy initialization to avoid flash of default content
  const [portalUrl, setPortalUrl] = useState(() => currentProfile?.portalUrl || 'https://demo.zoneminder.com');
  const [username, setUsername] = useState(() => currentProfile?.username || '');
  const [password, setPassword] = useState(() => currentProfile?.password || '');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Update state if currentProfile changes (e.g. after switching profiles)
  useEffect(() => {
    if (currentProfile) {
      console.log('Loading profile data into form:', currentProfile.name);
      setPortalUrl(currentProfile.portalUrl || 'https://demo.zoneminder.com');
      setUsername(currentProfile.username || '');
      setPassword(currentProfile.password || '');
    }
  }, [currentProfile]);

  // Try to discover API and CGI URLs from portal URL
  const discoverUrls = async (portal: string) => {
    const baseUrl = portal.replace(/\/$/, ''); // Remove trailing slash

    // Always use full URLs to support multiple servers
    // ZoneMinder typically has CORS enabled
    const apiPatterns = [
      `${baseUrl}/api`,
      `${baseUrl}/zm/api`,
    ];

    // Try common CGI URL patterns
    const cgiPatterns = [
      `${baseUrl}/zm/cgi-bin`,
      `${baseUrl}/cgi-bin`,
      `${baseUrl}/cgi-bin-zm`,
      `${baseUrl}/zmcgi`,
    ];

    let apiUrl = '';
    let cgiUrl = '';

    // Test API URLs
    console.log('Testing API patterns:', apiPatterns);

    for (const url of apiPatterns) {
      try {
        console.log(`Trying API URL: ${url}`);
        const client = createApiClient(url);
        setApiClient(client);
        const version = await getVersion();
        console.log(`✓ Successfully connected to ${url}`, version);
        apiUrl = url;
        break;
      } catch (e: unknown) {
        // 401 means API endpoint exists but requires auth - this is valid!
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((e as any).response?.status === 401) {
          console.log(`✓ API endpoint found at ${url} (requires auth)`);
          apiUrl = url;
          break;
        }
        // Continue trying other patterns
        console.log(`✗ Failed to connect to ${url}`, e);
      }
    }

    if (!apiUrl) {
      throw new Error('Could not discover API URL');
    }

    // For now, use the first CGI pattern - we'll validate this later
    cgiUrl = cgiPatterns[0];

    return { apiUrl, cgiUrl };
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError('');
    setSuccess(false);

    try {
      let apiUrl: string;
      let cgiUrl: string;

      // Check if portal URL has changed from the current profile
      const portalUrlChanged = currentProfile && currentProfile.portalUrl !== portalUrl;

      // If we have a current profile AND the portal URL hasn't changed, use existing URLs
      // Otherwise, discover URLs (either new profile OR portal URL changed)
      if (currentProfile && !portalUrlChanged) {
        console.log('[Setup] Using existing profile URLs (skipping discovery)');
        console.log('[Setup]   - API URL:', currentProfile.apiUrl);
        console.log('[Setup]   - CGI URL:', currentProfile.cgiUrl);
        apiUrl = currentProfile.apiUrl;
        cgiUrl = currentProfile.cgiUrl;

        // Initialize API client with existing URL
        const client = createApiClient(apiUrl);
        setApiClient(client);
      } else {
        // New profile OR portal URL changed - discover URLs
        if (portalUrlChanged) {
          console.log('[Setup] Portal URL changed - discovering new URLs...');
          console.log('[Setup]   - Old portal:', currentProfile?.portalUrl);
          console.log('[Setup]   - New portal:', portalUrl);
        } else {
          console.log('[Setup] New profile - discovering URLs...');
        }
        const discovered = await discoverUrls(portalUrl);
        apiUrl = discovered.apiUrl;
        cgiUrl = discovered.cgiUrl;
        console.log('[Setup]   - Discovered API URL:', apiUrl);
        console.log('[Setup]   - Discovered CGI URL:', cgiUrl);
      }

      // If credentials are provided, try to login
      if (username && password) {
        console.log('[Setup] Attempting login with provided credentials...');
        console.log('[Setup]   - Username:', username);
        try {
          const { login } = await import('../api/auth');
          await login({ user: username, pass: password });
          console.log('[Setup]   ✓ Login successful');
        } catch (loginError: unknown) {
          console.error('[Setup]   ✗ Login failed:', loginError);
          throw new Error(`Connection successful, but login failed: ${(loginError as Error).message || 'Unknown error'}`);
        }
      }

      setSuccess(true);
      setError('');

      if (currentProfile) {
        // If we are editing/logging in to an existing profile, update it
        console.log('[Setup] Updating existing profile:', currentProfile.name);
        const { updateProfile } = useProfileStore.getState();
        await updateProfile(currentProfile.id, {
          portalUrl,
          apiUrl,
          cgiUrl,
          username: username || undefined,
          password: password || undefined,
          lastUsed: Date.now(),
        });
      } else {
        // Otherwise add new profile
        console.log('[Setup] Adding new profile');
        const profileName = portalUrl.includes('demo.zoneminder.com')
          ? 'Demo Server'
          : portalUrl.includes('isaac')
            ? 'Isaac Server'
            : 'My ZoneMinder';

        addProfile({
          name: profileName,
          portalUrl,
          apiUrl,
          cgiUrl,
          username: username || undefined,
          password: password || undefined,
          isDefault: true,
        });
        console.log('[Setup]   - Created profile:', profileName);
      }

      // Navigate to monitors after a short delay
      setTimeout(() => {
        navigate('/monitors');
      }, 1000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to connect to ZoneMinder server');
      setSuccess(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl opacity-50" />

      <Card className="w-full max-w-md border-border/50 shadow-2xl backdrop-blur-xl bg-card/80 z-10">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-primary/20">
            <Video className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome to zmNg</CardTitle>
          <CardDescription className="text-base mt-2">
            Connect to your ZoneMinder server to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="portal" className="text-sm font-medium">Server URL</Label>
            <div className="relative">
              <Server className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="portal"
                type="url"
                placeholder="https://demo.zoneminder.com"
                value={portalUrl}
                onChange={(e) => setPortalUrl(e.target.value)}
                disabled={testing}
                className="pl-9 h-10 bg-background/50 border-input/50 focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={testing}
                className="h-10 bg-background/50 border-input/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={testing}
                  className="h-10 bg-background/50 border-input/50 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={testing}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <div className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <ShieldCheck className="h-4 w-4" />
              Connection successful! Redirecting...
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-2">
          <Button
            onClick={handleTestConnection}
            disabled={testing || !portalUrl}
            className="w-full h-11 text-base font-medium shadow-lg hover:shadow-primary/25 transition-all duration-300"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect Server
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
