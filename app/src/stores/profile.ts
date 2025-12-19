/**
 * Profile Store
 * 
 * Manages the list of ZoneMinder server profiles and the current active profile.
 * Handles secure storage of passwords and profile switching logic.
 * 
 * Key features:
 * - Persists profiles to localStorage (excluding passwords)
 * - Stores passwords in secure storage (native Keychain/Keystore or encrypted in localStorage)
 * - Handles profile switching with full state cleanup (auth, cache, API client)
 * - Manages app initialization state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile } from '../api/types';
import { createApiClient, setApiClient } from '../api/client';
import { getServerTimeZone } from '../api/time';
import { fetchZmsPath } from '../api/auth';
import { setSecureValue, getSecureValue, removeSecureValue } from '../lib/secureStorage';
import { log } from '../lib/logger';
import { useAuthStore } from './auth';

interface ProfileState {
  profiles: Profile[];
  currentProfileId: string | null;
  isInitialized: boolean;

  // Computed
  currentProfile: () => Profile | null;
  profileExists: (name: string, excludeId?: string) => boolean;


  // Actions
  addProfile: (profile: Omit<Profile, 'id' | 'createdAt'>) => Promise<string>;
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  deleteAllProfiles: () => Promise<void>;
  switchProfile: (id: string) => Promise<void>;
  setDefaultProfile: (id: string) => void;
  reLogin: () => Promise<boolean>;

  // Helpers
  getDecryptedPassword: (profileId: string) => Promise<string | undefined>;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: [],
      currentProfileId: null,
      isInitialized: false,

      /**
       * Get the currently active profile object.
       */
      currentProfile: () => {
        const { profiles, currentProfileId } = get();
        return profiles.find((p) => p.id === currentProfileId) || null;
      },

      /**
       * Check if a profile with the given name already exists.
       * Case-insensitive.
       */
      profileExists: (name, excludeId) => {
        const { profiles } = get();
        return profiles.some(
          (p) => p.name.toLowerCase() === name.toLowerCase() && p.id !== excludeId
        );
      },

      /**
       * Add a new profile.
       * 
       * Generates a UUID, encrypts the password (if provided), and adds to the list.
       * If it's the first profile, it becomes the default and current profile.
       */
      addProfile: async (profileData) => {
        // Check for duplicate names
        if (get().profileExists(profileData.name)) {
          throw new Error(`Profile "${profileData.name}" already exists`);
        }

        const newProfileId = crypto.randomUUID();

        // Store password in secure storage (native keystore on mobile, encrypted on web)
        if (profileData.password) {
          try {
            await setSecureValue(`password_${newProfileId}`, profileData.password);
            log.profile('Password stored securely', { profileId: newProfileId });
          } catch (error) {
            log.error('Failed to store password securely', { component: 'Profile' }, error);
            throw new Error('Failed to securely store password');
          }
        }

        // Don't store password in Zustand state - it's in secure storage
        const newProfile: Profile = {
          ...profileData,
          password: profileData.password ? 'stored-securely' : undefined, // Flag indicating password exists
          id: newProfileId,
          createdAt: Date.now(),
        };

        set((state) => {
          // If this is the first profile, make it default
          const isFirst = state.profiles.length === 0;
          const profiles = [...state.profiles, newProfile];

          return {
            profiles,
            currentProfileId: isFirst ? newProfile.id : state.currentProfileId,
          };
        });

        // If this is now the current profile, initialize API client
        if (get().currentProfileId === newProfile.id) {
          setApiClient(createApiClient(newProfile.apiUrl));

          // Fetch timezone for new profile
          try {
            // Get token from auth store state
            const { useAuthStore } = await import('./auth');
            const { accessToken } = useAuthStore.getState();
            const timezone = await getServerTimeZone(accessToken || undefined);
            get().updateProfile(newProfile.id, { timezone });
          } catch (e) {
            log.warn('Failed to fetch timezone for new profile', { error: e });
          }
        }

        return newProfileId;
      },

      /**
       * Update an existing profile.
       * 
       * Handles password updates by re-encrypting and storing in secure storage.
       * Re-initializes API client if the current profile's URL changes.
       */
      updateProfile: async (id, updates) => {
        log.profile(`updateProfile called for profile ID: ${id}`, updates);

        // Check for duplicate names if name is being updated
        if (updates.name && get().profileExists(updates.name, id)) {
          throw new Error(`Profile "${updates.name}" already exists`);
        }

        // Store password in secure storage if provided
        let processedUpdates = { ...updates };
        if (updates.password) {
          try {
            await setSecureValue(`password_${id}`, updates.password);
            log.profile('Password updated in secure storage', { profileId: id });
            // Set flag instead of actual password
            processedUpdates.password = 'stored-securely';
          } catch (error) {
            log.error('Failed to update password in secure storage', { component: 'Profile' }, error);
            throw new Error('Failed to securely update password');
          }
        }

        set((state) => ({
          profiles: state.profiles.map((p) => (p.id === id ? { ...p, ...processedUpdates } : p)),
        }));

        // If updating current profile's API URL, reinitialize client
        const currentProfile = get().currentProfile();
        if (currentProfile?.id === id && updates.apiUrl) {
          setApiClient(createApiClient(updates.apiUrl, get().reLogin));
        }

        log.profile('updateProfile complete');
      },

      /**
       * Delete a profile.
       * 
       * Removes the profile from the list and deletes its password from secure storage.
       * If the current profile is deleted, switches to another available profile or null.
       */
      deleteProfile: async (id) => {
        // Remove password from secure storage
        try {
          await removeSecureValue(`password_${id}`);
          log.profile('Password removed from secure storage', { profileId: id });
        } catch (error) {
          log.warn('Failed to remove password from secure storage', { component: 'Profile' }, error);
        }

        set((state) => {
          const profiles = state.profiles.filter((p) => p.id !== id);
          const currentProfileId =
            state.currentProfileId === id
              ? profiles.length > 0
                ? profiles[0].id
                : null
              : state.currentProfileId;

          return { profiles, currentProfileId };
        });

        // Reinitialize API client if current profile changed
        const newCurrentProfile = get().currentProfile();
        if (newCurrentProfile) {
          setApiClient(createApiClient(newCurrentProfile.apiUrl, get().reLogin));
        }
      },

      /**
       * Delete all profiles.
       * 
       * Clears all profiles and removes all passwords from secure storage.
       * Resets the API client.
       */
      deleteAllProfiles: async () => {
        const { profiles } = get();

        // Remove all passwords from secure storage
        for (const profile of profiles) {
          try {
            await removeSecureValue(`password_${profile.id}`);
            log.profile('Password removed from secure storage', { profileId: profile.id });
          } catch (error) {
            log.warn('Failed to remove password from secure storage', { component: 'Profile' }, error);
          }
        }

        // Clear all profiles and reset state
        set({ profiles: [], currentProfileId: null });

        // Reset API client
        const { resetApiClient } = await import('../api/client');
        resetApiClient();

        log.profile('All profiles deleted');
      },

      /**
       * Switch to a different profile.
       * 
       * Performs a full context switch:
       * 1. Clears auth state (logout)
       * 2. Clears query cache (React Query)
       * 3. Resets API client
       * 4. Sets new profile as current
       * 5. Initializes API client with new URL
       * 6. Attempts to authenticate with stored credentials
       * 
       * Includes rollback logic if switching fails.
       */
      switchProfile: async (id) => {
        const profile = get().profiles.find((p) => p.id === id);
        if (!profile) {
          throw new Error(`Profile ${id} not found`);
        }

        // Save previous profile for rollback
        const previousProfileId = get().currentProfileId;
        const previousProfile = previousProfileId
          ? get().profiles.find((p) => p.id === previousProfileId)
          : null;

        log.profile('Starting profile switch', {
          from: previousProfile?.name || 'None',
          to: profile.name,
          targetPortal: profile.portalUrl,
          targetAPI: profile.apiUrl,
        });

        try {
          // STEP 1: Clear ALL existing state FIRST (critical for avoiding data mixing)
          log.profile('Step 1: Clearing all existing state');

          const { useAuthStore } = await import('./auth');
          log.profile('Clearing auth state (logout)');
          useAuthStore.getState().logout();

          const { clearQueryCache } = await import('./query-cache');
          log.profile('Clearing query cache');
          clearQueryCache();

          const { resetApiClient } = await import('../api/client');
          log.profile('Resetting API client');
          resetApiClient();

          // STEP 2: Update current profile ID
          log.profile('Step 2: Setting new profile as current');
          set({ currentProfileId: id });

          // Update last used timestamp (don't await this)
          get().updateProfile(id, { lastUsed: Date.now() });

          // STEP 3: Initialize API client with new profile
          log.profile('Step 3: Initializing API client', { apiUrl: profile.apiUrl });
          setApiClient(createApiClient(profile.apiUrl, get().reLogin));
          log.profile('API client initialized');

          // STEP 4: Authenticate immediately if credentials exist
          if (profile.username && profile.password) {
            log.profile('Step 4: Authenticating with stored credentials', {
              username: profile.username,
            });

            try {
              // Decrypt password before login
              const decryptedPassword = await get().getDecryptedPassword(id);
              if (!decryptedPassword) {
                throw new Error('Failed to decrypt password');
              }

              // Use the auth store action so state is updated!
              const { useAuthStore } = await import('./auth');
              await useAuthStore.getState().login(profile.username, decryptedPassword);
              log.profile('Authentication successful');
            } catch (authError: unknown) {
              log.warn('Authentication failed - this might be OK if server does not require auth', {
                component: 'Profile',
                error: authError,
              });
              // Don't throw - allow switch to complete even if auth fails
              // Some servers (like demo.zoneminder.com) work without auth
            }
            log.profile('No credentials stored, skipping authentication');
            log.info('This is normal for public servers', { component: 'Profile' });
          }

          // STEP 5: Fetch Server Timezone
          try {
            log.profile('Step 5: Fetching server timezone');
            // Explicitly pass token if we have one to ensure it's used
            const { useAuthStore } = await import('./auth');
            const { accessToken } = useAuthStore.getState();
            const timezone = await getServerTimeZone(accessToken || undefined);
            log.profile('Server timezone fetched', { timezone });
            get().updateProfile(id, { timezone });
          } catch (tzError) {
            log.warn('Failed to fetch server timezone', { error: tzError });
            // Don't fail the switch for this
          }

          // STEP 5.5: Fetch ZMS path and update CGI URL if different from inferred
          try {
            log.profile('Step 5.5: Fetching ZMS path from server config');
            const zmsPath = await fetchZmsPath();
            if (zmsPath && profile.portalUrl) {
              // Construct the full CGI URL from portal + ZMS path
              try {
                const url = new URL(profile.portalUrl);
                const newCgiUrl = `${url.origin}${zmsPath}`;

                // Only update if different from current
                if (newCgiUrl !== profile.cgiUrl) {
                  log.profile('ZMS path fetched, updating CGI URL', {
                    oldCgiUrl: profile.cgiUrl,
                    zmsPath,
                    newCgiUrl
                  });
                  get().updateProfile(id, { cgiUrl: newCgiUrl });
                } else {
                  log.profile('ZMS path matches current CGI URL, no update needed', { cgiUrl: profile.cgiUrl });
                }
              } catch (urlError) {
                log.warn('Failed to construct CGI URL from ZMS path', {
                  portalUrl: profile.portalUrl,
                  zmsPath,
                  error: urlError
                });
              }
            } else {
              log.profile('ZMS path not available, keeping current CGI URL', { cgiUrl: profile.cgiUrl });
            }
          } catch (zmsError) {
            log.warn('Failed to fetch ZMS path during profile switch', { error: zmsError });
            // Don't fail the switch for this
          }

          log.profile('Profile switch completed successfully', { currentProfile: profile.name });

        } catch (error) {
          log.error('Profile switch FAILED', { component: 'Profile' }, error);

          // ROLLBACK: Restore previous profile if it exists
          if (previousProfile) {
            log.profile('Starting rollback to previous profile', {
              previousProfile: previousProfile.name,
            });

            try {
              // Clear state again to ensure clean rollback
              const { useAuthStore } = await import('./auth');
              useAuthStore.getState().logout();

              const { clearQueryCache } = await import('./query-cache');
              clearQueryCache();

              const { resetApiClient } = await import('../api/client');
              resetApiClient();

              // Restore previous profile
              log.profile('Restoring previous profile ID');
              set({ currentProfileId: previousProfileId });

              // Re-initialize with previous profile
              log.profile('Re-initializing API client', { apiUrl: previousProfile.apiUrl });
              setApiClient(createApiClient(previousProfile.apiUrl, get().reLogin));

              // Try to re-authenticate with previous profile
              if (previousProfile.username && previousProfile.password) {
                log.profile('Re-authenticating with previous profile');
                const decryptedPassword = await get().getDecryptedPassword(previousProfileId!);
                if (decryptedPassword) {
                  const { useAuthStore } = await import('./auth');
                  await useAuthStore
                    .getState()
                    .login(previousProfile.username, decryptedPassword);
                  log.profile('Rollback successful', { restoredTo: previousProfile.name });
                }
              } else {
                log.profile('Rollback successful (no auth)');
              }
            } catch (rollbackError) {
              log.error('Rollback FAILED - user may need to manually re-authenticate', {
                component: 'Profile',
              }, rollbackError);
            }
          }

          // Re-throw the original error
          throw error;
        }
      },

      setDefaultProfile: (id) => {
        set((state) => ({
          profiles: state.profiles.map((p) => ({
            ...p,
            isDefault: p.id === id,
          })),
        }));
      },

      reLogin: async () => {
        const { currentProfileId, getDecryptedPassword, profiles } = get();
        if (!currentProfileId) return false;

        const profile = profiles.find((p) => p.id === currentProfileId);
        if (!profile || !profile.username || !profile.password) return false;

        try {
          const password = await getDecryptedPassword(currentProfileId);
          if (!password) return false;

          const { useAuthStore } = await import('./auth');
          await useAuthStore.getState().login(profile.username, password);
          return true;
        } catch (e) {
          log.error('Re-login helper failed', { error: e });
          return false;
        }
      },

      /**
       * Retrieve decrypted password for a profile.
       * 
       * Fetches the encrypted password from secure storage and decrypts it.
       */
      getDecryptedPassword: async (profileId) => {
        const profile = get().profiles.find((p) => p.id === profileId);
        if (!profile?.password || profile.password !== 'stored-securely') {
          return undefined;
        }

        try {
          const password = await getSecureValue(`password_${profileId}`);
          return password || undefined;
        } catch (error) {
          log.error('Failed to retrieve password from secure storage', { component: 'Profile' }, error);
          return undefined;
        }
      },
    }),
    {
      name: 'zmng-profiles',
      // On load, initialize API client with current profile and authenticate
      onRehydrateStorage: () => async (state) => {
        try {
          log.profile('onRehydrateStorage called', { hasState: !!state, currentProfileId: state?.currentProfileId });
        } catch {
          // Logger might not be initialized in test environment
        }

        if (!state?.currentProfileId) {
          try {
            log.profile('No current profile found on app load', { state });
          } catch {
            // Logger might not be initialized in test environment
          }
          setTimeout(() => useProfileStore.setState({ isInitialized: true }), 0);
          try {
            log.profile('isInitialized set to true (no profile)');
          } catch {
            // Logger might not be initialized in test environment
          }
          return;
        }

        const profile = state.profiles.find((p) => p.id === state.currentProfileId);
        if (!profile) {
          try {
            log.error('Current profile ID exists but profile not found', {
              component: 'Profile',
              profileId: state.currentProfileId,
            });
          } catch {
            // Logger might not be initialized in test environment
          }
          // CRITICAL: Set isInitialized even on error to prevent hanging
          setTimeout(() => useProfileStore.setState({ isInitialized: true }), 0);
          return;
        }

        try {
          log.profile('App loading with profile', {
            name: profile.name,
            id: profile.id,
            portalUrl: profile.portalUrl,
            apiUrl: profile.apiUrl,
            cgiUrl: profile.cgiUrl,
            username: profile.username || '(not set)',
            hasPassword: !!profile.password,
            passwordLength: profile.password?.length,
            isDefault: profile.isDefault,
            createdAt: new Date(profile.createdAt).toLocaleString(),
            lastUsed: profile.lastUsed ? new Date(profile.lastUsed).toLocaleString() : 'never',
          });
        } catch {
          // Logger might not be initialized in test environment
        }

        // STEP 1: Clear any stale auth state and cache from previous sessions
        try {
          log.profile('Clearing stale auth and cache');
        } catch {
          // Logger might not be initialized in test environment
        }
        const { useAuthStore } = await import('./auth');
        useAuthStore.getState().logout();

        const { clearQueryCache } = await import('./query-cache');
        clearQueryCache();

        // STEP 2: Initialize API client for current profile
        try {
          log.profile('Initializing API client', { apiUrl: profile.apiUrl });
        } catch {
          // Logger might not be initialized in test environment
        }
        setApiClient(createApiClient(profile.apiUrl, useProfileStore.getState().reLogin));

        // STEP 3: Authenticate if credentials exist
        // IMPORTANT: Wrap in try-finally to ensure isInitialized is ALWAYS set,
        // even if authentication hangs or fails. This prevents the app from
        // hanging on the loading screen indefinitely.
        try {
          if (profile.username && profile.password) {
            try {
              log.profile('Authenticating with stored credentials', { username: profile.username });
            } catch {
              // Logger might not be initialized in test environment
            }
            try {
              // Decrypt password before login
              const decryptedPassword = await useProfileStore
                .getState()
                .getDecryptedPassword(state.currentProfileId);
              if (!decryptedPassword) {
                throw new Error('Failed to decrypt password');
              }

              const { useAuthStore } = await import('./auth');
              await useAuthStore.getState().login(profile.username, decryptedPassword);
              try {
                log.profile('Authentication successful on app load');
              } catch {
                // Logger might not be initialized in test environment
              }
            } catch (error) {
              try {
                log.warn('Authentication failed on app load - this might be OK if server does not require auth', {
                  component: 'Profile',
                  error,
                });
              } catch {
                // Logger might not be initialized in test environment
              }
              // Don't crash the app - some servers work without auth
            }
          } else {
            log.profile('No credentials stored, skipping authentication');
            log.info('This is normal for public servers', { component: 'Profile' });
          }
          // STEP 4: Fetch timezone on load
          try {
            log.profile('Fetching server timezone on load');
            const { useAuthStore } = await import('./auth');
            const { accessToken } = useAuthStore.getState();
            const timezone = await getServerTimeZone(accessToken || undefined);
            if (timezone !== profile.timezone) {
              // Update profile with new timezone if changed
              useProfileStore.getState().updateProfile(profile.id, { timezone });
            }
          } catch (tzError) {
            log.warn('Failed to fetch timezone on load', { error: tzError });
          }

          // STEP 4.5: Fetch ZMS path and update CGI URL if different from inferred
          try {
            log.profile('Fetching ZMS path from server config');
            const zmsPath = await fetchZmsPath();
            if (zmsPath && profile.portalUrl) {
              // Construct the full CGI URL from portal + ZMS path
              try {
                const url = new URL(profile.portalUrl);
                const newCgiUrl = `${url.origin}${zmsPath}`;

                // Only update if different from current
                if (newCgiUrl !== profile.cgiUrl) {
                  log.profile('ZMS path fetched, updating CGI URL', {
                    oldCgiUrl: profile.cgiUrl,
                    zmsPath,
                    newCgiUrl
                  });
                  useProfileStore.getState().updateProfile(profile.id, { cgiUrl: newCgiUrl });
                } else {
                  log.profile('ZMS path matches current CGI URL, no update needed', { cgiUrl: profile.cgiUrl });
                }
              } catch (urlError) {
                log.warn('Failed to construct CGI URL from ZMS path', {
                  portalUrl: profile.portalUrl,
                  zmsPath,
                  error: urlError
                });
              }
            } else {
              log.profile('ZMS path not available, keeping current CGI URL', { cgiUrl: profile.cgiUrl });
            }
          } catch (zmsError) {
            log.warn('Failed to fetch ZMS path on load', { error: zmsError });
            // Don't fail initialization for this
          }

        } finally {
          // CRITICAL: Always set isInitialized to true, even if authentication fails
          // This allows the app to proceed to the UI and show any error messages
          log.profile('App initialization complete - setting isInitialized to true');
          setTimeout(() => useProfileStore.setState({ isInitialized: true }), 0);
          log.profile('isInitialized flag set successfully');
        }
      },
    }
  )
);

// Subscribe to auth store to update refresh token in profile
useAuthStore.subscribe((state) => {
  const { refreshToken } = state;
  const { currentProfileId, updateProfile, currentProfile } = useProfileStore.getState();

  if (currentProfileId && refreshToken) {
    const profile = currentProfile();
    if (profile && profile.refreshToken !== refreshToken) {
      log.profile('Updating profile with new refresh token', { profileId: currentProfileId });
      updateProfile(currentProfileId, { refreshToken });
    }
  }
});
