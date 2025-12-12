/**
 * Setup Page
 *
 * Initial application setup wizard.
 * Guides the user through connecting to their first ZoneMinder server.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { useProfileStore } from '../stores/profile';
import { createApiClient, setApiClient } from '../api/client';
import { discoverZoneminder, DiscoveryError } from '../lib/discovery';
import { Video, Server, ShieldCheck, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { log } from '../lib/logger';

export default function Setup() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const addProfile = useProfileStore((state) => state.addProfile);
  const currentProfile = useProfileStore((state) => state.currentProfile());

  // Initialize with current profile data if available, otherwise use defaults
  // Use lazy initialization to avoid flash of default content
  const [profileName, setProfileName] = useState(() => currentProfile?.name || '');
  const [portalUrl, setPortalUrl] = useState(() => currentProfile?.portalUrl || 'https://demo.zoneminder.com');
  const [username, setUsername] = useState(() => currentProfile?.username || '');
  const [password, setPassword] = useState(() => currentProfile?.password || '');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Manual URL entry mode
  const [showManualUrls, setShowManualUrls] = useState(false);
  const [manualApiUrl, setManualApiUrl] = useState(() => currentProfile?.apiUrl || '');
  const [manualCgiUrl, setManualCgiUrl] = useState(() => currentProfile?.cgiUrl || '');

  // Update state if currentProfile changes (e.g. after switching profiles)
  useEffect(() => {
    if (currentProfile) {
      log.info('Loading profile data into form', { component: 'Setup', profileName: currentProfile.name });
      setProfileName(currentProfile.name || '');
      setPortalUrl(currentProfile.portalUrl || 'https://demo.zoneminder.com');
      setUsername(currentProfile.username || '');
      setManualApiUrl(currentProfile.apiUrl || '');
      setManualCgiUrl(currentProfile.cgiUrl || '');

      // Decrypt password if it's stored securely
      if (currentProfile.password === 'stored-securely') {
        const getDecryptedPassword = useProfileStore.getState().getDecryptedPassword;
        getDecryptedPassword(currentProfile.id).then((decrypted) => {
          setPassword(decrypted || '');
        }).catch((error) => {
          log.error('Failed to decrypt password', { component: 'Setup' }, error);
          setPassword('');
        });
      } else {
        setPassword(currentProfile.password || '');
      }
    }
  }, [currentProfile]);

  // Try to discover API and CGI URLs from portal URL
  const discoverUrls = async (portal: string) => {
    try {
      const result = await discoverZoneminder(portal);

      // Initialize client
      const client = createApiClient(result.apiUrl);
      setApiClient(client);

      // We don't call getVersion() here because it might fail with 401 if auth is required.
      // We trust discoverZoneminder() which already probed the endpoint.
      log.info('Successfully connected', { component: 'Setup', apiUrl: result.apiUrl });

      return result;
    } catch (e) {
      if (e instanceof DiscoveryError) {
        log.warn('Discovery failed', { component: 'Setup', message: e.message, code: e.code });
        throw e;
      }
      throw new Error(t('setup.discovery_failed'));
    }
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
        log.info('Using existing profile URLs (skipping discovery)', {
          component: 'Setup',
          apiUrl: currentProfile.apiUrl,
          cgiUrl: currentProfile.cgiUrl
        });
        apiUrl = currentProfile.apiUrl;
        cgiUrl = currentProfile.cgiUrl;

        // Initialize API client with existing URL
        const client = createApiClient(apiUrl);
        setApiClient(client);
      } else if (showManualUrls) {
        // Manual URL entry mode
        log.info('Using manual URLs', { component: 'Setup' });
        if (!manualApiUrl || !manualCgiUrl) {
          throw new Error(t('setup.enter_both_urls'));
        }

        // Validate that portal and API have matching protocols
        const portalHasProtocol = portalUrl.startsWith('http://') || portalUrl.startsWith('https://');
        const portalProtocol = portalUrl.startsWith('https://') ? 'https' : 'http';
        const apiHasProtocol = manualApiUrl.startsWith('http://') || manualApiUrl.startsWith('https://');
        const apiProtocol = manualApiUrl.startsWith('https://') ? 'https' : 'http';

        if (portalHasProtocol && apiHasProtocol && portalProtocol !== apiProtocol) {
          throw new Error(
            `Protocol mismatch! Portal uses ${portalProtocol}:// but API uses ${apiProtocol}://. ` +
            `Both must use the same protocol (either both HTTP or both HTTPS).`
          );
        }

        apiUrl = manualApiUrl;
        cgiUrl = manualCgiUrl;
        log.info('Manual URLs set', { component: 'Setup', apiUrl, cgiUrl });

        // Initialize API client with manual URL
        const client = createApiClient(apiUrl);
        setApiClient(client);
      } else {
        // New profile OR portal URL changed - discover URLs
        try {
          if (portalUrlChanged) {
            log.info('Portal URL changed - discovering new URLs', {
              component: 'Setup',
              oldPortal: currentProfile?.portalUrl,
              newPortal: portalUrl
            });
          } else {
            log.info('New profile - discovering URLs', { component: 'Setup' });
          }
          const discovered = await discoverUrls(portalUrl);
          apiUrl = discovered.apiUrl;
          cgiUrl = discovered.cgiUrl;
          log.info('URLs discovered', { component: 'Setup', apiUrl, cgiUrl });
        } catch (discoveryError) {
          // Discovery failed - offer manual entry
          log.error('URL discovery failed', { component: 'Setup' }, discoveryError);
          // Only force manual if strictly discovery failed, 
          // but we can pass the error message through if it tells the user to check their URL.

          let errorMsg = t('setup.discovery_failed_manual');
          if (discoveryError instanceof DiscoveryError) {
            errorMsg = discoveryError.message + ' ' + t('setup.discovery_failed_manual');
          }
          throw new Error(errorMsg);
        }
      }

      // If credentials are provided, try to login
      if (username && password) {
        log.info('Attempting login with provided credentials', { component: 'Setup', username });
        try {
          const { useAuthStore } = await import('../stores/auth');
          await useAuthStore.getState().login(username, password);
          log.info('Login successful', { component: 'Setup' });
        } catch (loginError: unknown) {
          log.error('Login failed', { component: 'Setup' }, loginError);
          throw new Error(t('setup.login_failed', { error: (loginError as Error).message || 'Unknown error' }));
        }
      }

      setSuccess(true);
      setError('');

      // Ensure portalUrl has a protocol before saving
      let finalPortalUrl = portalUrl;
      if (!finalPortalUrl.startsWith('http://') && !finalPortalUrl.startsWith('https://')) {
        finalPortalUrl = `https://${finalPortalUrl}`;
      }

      if (currentProfile) {
        // If we are editing/logging in to an existing profile, update it
        log.info('Updating existing profile', { component: 'Setup', profileName: currentProfile.name });
        const { updateProfile } = useProfileStore.getState();
        await updateProfile(currentProfile.id, {
          portalUrl: finalPortalUrl,
          apiUrl,
          cgiUrl,
          username: username || undefined,
          password: password || undefined,
          lastUsed: Date.now(),
        });
      } else {
        // Otherwise add new profile
        log.info('Adding new profile', { component: 'Setup' });
        // Use provided profile name, or fall back to auto-generated name
        const finalProfileName = profileName.trim() || (
          finalPortalUrl.includes('demo.zoneminder.com')
            ? 'Demo Server'
            : finalPortalUrl.includes('isaac')
              ? 'Isaac Server'
              : 'My ZoneMinder'
        );

        addProfile({
          name: finalProfileName,
          portalUrl: finalPortalUrl,
          apiUrl,
          cgiUrl,
          username: username || undefined,
          password: password || undefined,
          isDefault: true,
        });
        log.info('Profile created', { component: 'Setup', profileName: finalProfileName });
      }

      // Navigate to monitors after a short delay
      setTimeout(() => {
        navigate('/monitors');
      }, 1000);
    } catch (err: unknown) {
      setError((err as Error).message || t('setup.connection_failed'));
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
          <CardTitle className="text-2xl font-bold tracking-tight">{t('setup.welcome')}</CardTitle>
          <CardDescription className="text-base mt-2">
            {t('setup.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="profileName" className="text-sm font-medium">{t('setup.profile_name')}</Label>
            <Input
              id="profileName"
              type="text"
              placeholder={t('setup.profile_name_placeholder')}
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              disabled={testing}
              className="h-10 bg-background/50 border-input/50 focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portal" className="text-sm font-medium">{t('setup.server_url')}</Label>
            <div className="relative">
              <Server className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="portal"
                type="url"
                placeholder="https://demo.zoneminder.com"
                value={portalUrl}
                onChange={(e) => setPortalUrl(e.target.value)}
                disabled={testing}
                autoCapitalize="none"
                autoCorrect="off"
                className="pl-9 h-10 bg-background/50 border-input/50 focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">{t('setup.username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={testing}
                autoCapitalize="none"
                autoCorrect="off"
                className="h-10 bg-background/50 border-input/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t('setup.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={testing}
                  autoCapitalize="none"
                  autoCorrect="off"
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

          {/* Manual URL Entry Fields */}
          {showManualUrls && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t('setup.manual_config')}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualUrls(false)}
                  className="h-7 text-xs"
                >
                  {t('setup.use_auto_discovery')}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manualApiUrl" className="text-sm font-medium">{t('setup.api_url')}*</Label>
                <Input
                  id="manualApiUrl"
                  type="url"
                  placeholder="https://zm.example.com/zm/api"
                  value={manualApiUrl}
                  onChange={(e) => setManualApiUrl(e.target.value)}
                  disabled={testing}
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="h-10 bg-background/50 border-input/50"
                />
                <p className="text-xs text-muted-foreground">
                  {t('setup.api_url_hint')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manualCgiUrl" className="text-sm font-medium">{t('setup.cgi_url')}*</Label>
                <Input
                  id="manualCgiUrl"
                  type="url"
                  placeholder="https://zm.example.com/cgi-bin"
                  value={manualCgiUrl}
                  onChange={(e) => setManualCgiUrl(e.target.value)}
                  disabled={testing}
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="h-10 bg-background/50 border-input/50"
                />
                <p className="text-xs text-muted-foreground">
                  {t('setup.cgi_url_hint')}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-3">
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <div className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                {error}
              </div>
              {error.includes(t('setup.discovery_failed_manual')) && !showManualUrls && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualUrls(true)}
                  className="w-full"
                >
                  {t('setup.enter_urls_manually')}
                </Button>
              )}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <ShieldCheck className="h-4 w-4" />
              {t('setup.connection_success')}
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
                {t('setup.connecting')}
              </>
            ) : (
              <>
                {t('setup.connect_server')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
