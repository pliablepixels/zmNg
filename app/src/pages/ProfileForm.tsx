/**
 * Profile Form Page
 *
 * Unified form for adding ZoneMinder server profiles.
 * Used for both initial setup (when no profiles exist) and adding additional profiles.
 * Shows welcome messaging when this is the user's first profile.
 */

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { useProfileStore } from '../stores/profile';
import { createApiClient, setApiClient } from '../api/client';
import { discoverZoneminder, DiscoveryError } from '../lib/discovery';
import { Video, Server, ShieldCheck, ArrowRight, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { log, LogLevel } from '../lib/logger';
import { fetchZmsPath } from '../api/auth';

export default function ProfileForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const addProfile = useProfileStore((state) => state.addProfile);
  const profiles = useProfileStore((state) => state.profiles);

  // Check if this is the first profile (initial setup)
  const isFirstProfile = profiles.length === 0;
  const returnTo = searchParams.get('returnTo') || '/monitors';

  // Default to demo server only for first profile
  const [profileName, setProfileName] = useState('');
  const [portalUrl, setPortalUrl] = useState(isFirstProfile ? 'https://demo.zoneminder.com' : '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Manual URL entry mode
  const [showManualUrls, setShowManualUrls] = useState(false);
  const [manualApiUrl, setManualApiUrl] = useState('');
  const [manualCgiUrl, setManualCgiUrl] = useState('');

  // Discover API and CGI URLs from portal URL
  const discoverUrls = async (portal: string) => {
    try {
      const result = await discoverZoneminder(portal);

      // Initialize client
      const client = createApiClient(result.apiUrl);
      setApiClient(client);

      log.profileForm('Successfully connected', LogLevel.INFO, { apiUrl: result.apiUrl });

      return result;
    } catch (e) {
      if (e instanceof DiscoveryError) {
        throw e;
      }
      throw new Error(t('setup.discovery_failed'));
    }
  };

  const handleTestConnection = async () => {
    setError('');
    setSuccess(false);
    setTesting(true);

    try {
      const normalizedUsername = username.trim();
      const hasUsername = normalizedUsername.length > 0;
      const hasPassword = password.length > 0;

      if ((hasUsername && !hasPassword) || (hasPassword && !hasUsername)) {
        throw new Error(t('setup.credentials_incomplete'));
      }

      log.profileForm('Testing connection', LogLevel.INFO, { portalUrl });

      let confirmedPortalUrl: string;
      let apiUrl: string;
      let cgiUrl: string;

      if (showManualUrls) {
        // Manual URL entry mode
        log.profileForm('Using manual URLs', LogLevel.INFO);
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

        // Ensure portal URL has protocol for manual mode
        confirmedPortalUrl = portalUrl;
        if (!confirmedPortalUrl.startsWith('http://') && !confirmedPortalUrl.startsWith('https://')) {
          confirmedPortalUrl = `https://${confirmedPortalUrl}`;
        }

        apiUrl = manualApiUrl;
        cgiUrl = manualCgiUrl;
        log.profileForm('Manual URLs set', LogLevel.INFO, { portalUrl: confirmedPortalUrl, apiUrl, cgiUrl });

        // Initialize API client with manual URL
        const client = createApiClient(apiUrl);
        setApiClient(client);
      } else {
        // Discover URLs from portal URL
        log.profileForm('Discovering URLs', LogLevel.INFO);
        const discovered = await discoverUrls(portalUrl);
        confirmedPortalUrl = discovered.portalUrl;
        apiUrl = discovered.apiUrl;
        cgiUrl = discovered.cgiUrl;
        log.profileForm('URLs discovered', LogLevel.INFO, { portalUrl: confirmedPortalUrl, apiUrl, cgiUrl });
      }

      // If credentials are provided, try to login
      if (normalizedUsername && hasPassword) {
        log.profileForm('Attempting login with provided credentials', LogLevel.INFO, { username: normalizedUsername });
        try {
          const { useAuthStore } = await import('../stores/auth');

          // Clear any existing auth state to ensure clean login
          // This prevents old tokens from interfering with new profile login
          useAuthStore.getState().logout();
          log.profileForm('Cleared existing auth state for fresh login', LogLevel.DEBUG);

          await useAuthStore.getState().login(normalizedUsername, password);
          log.profileForm('Login successful', LogLevel.INFO);

          // After successful login, try to fetch the ZMS path from server config
          const zmsPath = await fetchZmsPath();
          if (zmsPath) {
            // Successfully fetched ZMS path - construct the full CGI URL using confirmed portal URL
            try {
              const url = new URL(confirmedPortalUrl);
              const newCgiUrl = `${url.origin}${zmsPath}`;
              log.profileForm('ZMS path fetched, updating CGI URL', LogLevel.INFO, {
                oldCgiUrl: cgiUrl,
                zmsPath,
                newCgiUrl
              });
              cgiUrl = newCgiUrl;
            } catch (urlError) {
              log.profileForm('Failed to construct CGI URL from ZMS path, using inferred URL', LogLevel.WARN, {
                confirmedPortalUrl,
                zmsPath,
                error: urlError
              });
            }
          } else {
            log.profileForm('ZMS path not available, using inferred CGI URL', LogLevel.INFO, {
              cgiUrl
            });
          }
        } catch (loginError: unknown) {
          log.profileForm('Login failed', LogLevel.ERROR, loginError);
          throw new Error(t('setup.login_failed', { error: (loginError as Error).message || 'Unknown error' }));
        }
      }

      setSuccess(true);
      setError('');

      // Generate profile name if not provided
      const finalProfileName = profileName.trim() || (
        confirmedPortalUrl.includes('demo.zoneminder.com')
          ? 'Demo Server'
          : confirmedPortalUrl.includes('isaac')
            ? 'Isaac Server'
            : 'My ZoneMinder'
      );

      log.profileForm('Adding new profile', LogLevel.INFO, { profileName: finalProfileName });
      const newProfileId = await addProfile({
        name: finalProfileName,
        portalUrl: confirmedPortalUrl,
        apiUrl,
        cgiUrl,
        username: normalizedUsername || undefined,
        password: password || undefined,
        isDefault: isFirstProfile,
      });
      log.profileForm('Profile created', LogLevel.INFO, { profileName: finalProfileName, profileId: newProfileId });

      // Switch to the newly created profile (unless it's the first profile, which is auto-set as current)
      if (!isFirstProfile) {
        const switchProfile = useProfileStore.getState().switchProfile;
        log.profileForm('Switching to newly created profile', LogLevel.INFO, { profileId: newProfileId });
        await switchProfile(newProfileId);
      }

      // Navigate after a short delay
      setTimeout(() => {
        navigate(returnTo);
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
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isFirstProfile ? t('setup.welcome') : t('profiles.add_dialog_title')}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {isFirstProfile ? t('setup.subtitle') : t('profiles.add_dialog_desc')}
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
                type="text"
                placeholder="https://demo.zoneminder.com"
                value={portalUrl}
                onChange={(e) => setPortalUrl(e.target.value)}
                disabled={testing}
                className="h-10 pl-10 bg-background/50 border-input/50 focus:border-primary/50 transition-colors"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('setup.server_url_hint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">{t('setup.username')}</Label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                placeholder={t('setup.username_placeholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={testing}
                className="h-10 pl-10 bg-background/50 border-input/50 focus:border-primary/50 transition-colors"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">{t('setup.password')}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('setup.password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={testing}
                className="h-10 pr-10 bg-background/50 border-input/50 focus:border-primary/50 transition-colors"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('setup.credentials_optional')}
            </p>
          </div>

          {/* Manual URL Entry Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowManualUrls(!showManualUrls)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showManualUrls ? t('setup.use_auto_discovery') : t('setup.manual_urls')}
            </button>
          </div>

          {showManualUrls && (
            <div className="space-y-4 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="apiUrl" className="text-sm font-medium">{t('setup.api_url')}</Label>
                <Input
                  id="apiUrl"
                  type="text"
                  placeholder="http://example.com/zm/api"
                  value={manualApiUrl}
                  onChange={(e) => setManualApiUrl(e.target.value)}
                  disabled={testing}
                  className="h-10 bg-background/50 border-input/50 focus:border-primary/50 transition-colors font-mono text-sm"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cgiUrl" className="text-sm font-medium">{t('setup.cgi_url')}</Label>
                <Input
                  id="cgiUrl"
                  type="text"
                  placeholder="http://example.com/zm/cgi-bin"
                  value={manualCgiUrl}
                  onChange={(e) => setManualCgiUrl(e.target.value)}
                  disabled={testing}
                  className="h-10 bg-background/50 border-input/50 focus:border-primary/50 transition-colors font-mono text-sm"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-600 dark:text-green-400">
              {t('setup.success')}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            onClick={handleTestConnection}
            disabled={testing || !portalUrl}
            className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('setup.testing')}
              </>
            ) : (
              <>
                {isFirstProfile ? t('setup.connect') : t('profiles.add')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          {!isFirstProfile && (
            <Button
              variant="outline"
              onClick={() => navigate('/profiles')}
              disabled={testing}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('common.cancel')}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
