import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile } from '../api/types';
import { createApiClient, setApiClient } from '../api/client';

interface ProfileState {
  profiles: Profile[];
  currentProfileId: string | null;

  // Computed
  currentProfile: () => Profile | null;
  profileExists: (name: string, excludeId?: string) => boolean;

  // Actions
  addProfile: (profile: Omit<Profile, 'id' | 'createdAt'>) => Promise<void>;
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<void>;
  deleteProfile: (id: string) => void;
  switchProfile: (id: string) => Promise<void>;
  setDefaultProfile: (id: string) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: [],
      currentProfileId: null,

      currentProfile: () => {
        const { profiles, currentProfileId } = get();
        return profiles.find((p) => p.id === currentProfileId) || null;
      },

      profileExists: (name, excludeId) => {
        const { profiles } = get();
        return profiles.some(
          (p) => p.name.toLowerCase() === name.toLowerCase() && p.id !== excludeId
        );
      },

      addProfile: async (profileData) => {
        // Check for duplicate names
        if (get().profileExists(profileData.name)) {
          throw new Error(`Profile "${profileData.name}" already exists`);
        }

        const newProfile: Profile = {
          ...profileData,
          id: crypto.randomUUID(),
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
        }
      },

      updateProfile: async (id, updates) => {
        console.log('[Profile Store] updateProfile called');
        console.log('[Profile Store]   - Profile ID:', id);
        console.log('[Profile Store]   - Updates:', updates);
        console.log('[Profile Store]   - Updates keys:', Object.keys(updates));
        console.log('[Profile Store]   - Has password in updates:', 'password' in updates);
        console.log('[Profile Store]   - Password value:', updates.password ? `(${updates.password.length} chars)` : 'undefined');
        console.log('[Profile Store]   - Has username in updates:', 'username' in updates);
        console.log('[Profile Store]   - Username value:', updates.username || 'undefined');

        // Check for duplicate names if name is being updated
        if (updates.name && get().profileExists(updates.name, id)) {
          throw new Error(`Profile "${updates.name}" already exists`);
        }

        // Get profile before update
        const profileBefore = get().profiles.find((p) => p.id === id);
        console.log('[Profile Store]   - Profile before update:', {
          username: profileBefore?.username,
          hasPassword: !!profileBefore?.password,
          passwordLength: profileBefore?.password?.length,
        });

        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));

        // Get profile after update
        const profileAfter = get().profiles.find((p) => p.id === id);
        console.log('[Profile Store]   - Profile after update:', {
          username: profileAfter?.username,
          hasPassword: !!profileAfter?.password,
          passwordLength: profileAfter?.password?.length,
        });

        // If updating current profile's API URL, reinitialize client
        const currentProfile = get().currentProfile();
        if (currentProfile?.id === id && updates.apiUrl) {
          setApiClient(createApiClient(updates.apiUrl));
        }

        console.log('[Profile Store] updateProfile complete');
      },

      deleteProfile: (id) => {
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
          setApiClient(createApiClient(newCurrentProfile.apiUrl));
        }
      },

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

        console.log('════════════════════════════════════════════════');
        console.log('[Profile Switch] Starting switch');
        console.log('[Profile Switch] From:', previousProfile?.name || 'None');
        console.log('[Profile Switch] To:', profile.name);
        console.log('[Profile Switch] Target Portal:', profile.portalUrl);
        console.log('[Profile Switch] Target API:', profile.apiUrl);
        console.log('════════════════════════════════════════════════');

        try {
          // STEP 1: Clear ALL existing state FIRST (critical for avoiding data mixing)
          console.log('[Profile Switch] Step 1: Clearing all existing state...');

          const { useAuthStore } = await import('./auth');
          console.log('[Profile Switch]   - Clearing auth state (logout)...');
          useAuthStore.getState().logout();

          const { clearQueryCache } = await import('./query-cache');
          console.log('[Profile Switch]   - Clearing query cache...');
          clearQueryCache();

          const { resetApiClient } = await import('../api/client');
          console.log('[Profile Switch]   - Resetting API client...');
          resetApiClient();

          // STEP 2: Update current profile ID
          console.log('[Profile Switch] Step 2: Setting new profile as current...');
          set({ currentProfileId: id });

          // Update last used timestamp (don't await this)
          get().updateProfile(id, { lastUsed: Date.now() });

          // STEP 3: Initialize API client with new profile
          console.log('[Profile Switch] Step 3: Initializing API client...');
          console.log('[Profile Switch]   - Creating API client for:', profile.apiUrl);
          setApiClient(createApiClient(profile.apiUrl));
          console.log('[Profile Switch]   - API client initialized');

          // STEP 4: Authenticate immediately if credentials exist
          if (profile.username && profile.password) {
            console.log('[Profile Switch] Step 4: Authenticating with stored credentials...');
            console.log('[Profile Switch]   - Username:', profile.username);
            console.log('[Profile Switch]   - Calling login API...');

            try {
              // Use the auth store action so state is updated!
              const { useAuthStore } = await import('./auth');
              await useAuthStore.getState().login(profile.username, profile.password);
              console.log('[Profile Switch]   ✓ Authentication successful!');
            } catch (authError: unknown) {
              console.error('[Profile Switch]   ✗ Authentication failed:', authError);
              console.error('[Profile Switch]   This might be OK if the server doesn\'t require auth');
              // Don't throw - allow switch to complete even if auth fails
              // Some servers (like demo.zoneminder.com) work without auth
            }
          } else {
            console.log('[Profile Switch] Step 4: No credentials stored, skipping authentication');
            console.log('[Profile Switch]   ℹ This is normal for public servers like demo.zoneminder.com');
          }

          console.log('════════════════════════════════════════════════');
          console.log('[Profile Switch] ✓ Switch completed successfully!');
          console.log('[Profile Switch] Current profile:', profile.name);
          console.log('════════════════════════════════════════════════');

        } catch (error) {
          console.error('════════════════════════════════════════════════');
          console.error('[Profile Switch] ✗ Switch FAILED:', error);
          console.error('════════════════════════════════════════════════');

          // ROLLBACK: Restore previous profile if it exists
          if (previousProfile) {
            console.log('[Profile Switch] Starting rollback to previous profile...');
            console.log('[Profile Switch]   - Previous profile:', previousProfile.name);

            try {
              // Clear state again to ensure clean rollback
              const { useAuthStore } = await import('./auth');
              useAuthStore.getState().logout();

              const { clearQueryCache } = await import('./query-cache');
              clearQueryCache();

              const { resetApiClient } = await import('../api/client');
              resetApiClient();

              // Restore previous profile
              console.log('[Profile Switch]   - Restoring previous profile ID...');
              set({ currentProfileId: previousProfileId });

              // Re-initialize with previous profile
              console.log('[Profile Switch]   - Re-initializing API client:', previousProfile.apiUrl);
              setApiClient(createApiClient(previousProfile.apiUrl));

              // Try to re-authenticate with previous profile
              if (previousProfile.username && previousProfile.password) {
                console.log('[Profile Switch]   - Re-authenticating with previous profile...');
                const { useAuthStore } = await import('./auth');
                await useAuthStore.getState().login(previousProfile.username, previousProfile.password);
                console.log('[Profile Switch]   ✓ Rollback successful, restored to:', previousProfile.name);
              } else {
                console.log('[Profile Switch]   ✓ Rollback successful (no auth)');
              }
            } catch (rollbackError) {
              console.error('[Profile Switch]   ✗ Rollback FAILED:', rollbackError);
              console.error('[Profile Switch]   User may need to manually re-authenticate');
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
    }),
    {
      name: 'zmng-profiles',
      // On load, initialize API client with current profile and authenticate
      onRehydrateStorage: () => async (state) => {
        // Log what's in localStorage
        try {
          const storedData = localStorage.getItem('zmng-profiles');
          console.log('[Profile Store] Raw localStorage data:', storedData);
          if (storedData) {
            const parsed = JSON.parse(storedData);
            console.log('[Profile Store] Parsed localStorage:', parsed);
            console.log('[Profile Store] Profiles in localStorage:', parsed.state?.profiles);
          }
        } catch (e) {
          console.error('[Profile Store] Error reading localStorage:', e);
        }
        if (!state?.currentProfileId) {
          console.log('[Profile Init] No current profile found on app load');
          return;
        }

        const profile = state.profiles.find((p) => p.id === state.currentProfileId);
        if (!profile) {
          console.error('[Profile Init] Current profile ID exists but profile not found:', state.currentProfileId);
          return;
        }

        console.log('════════════════════════════════════════════════');
        console.log('[Profile Init] App loading with profile:', profile.name);
        console.log('[Profile Init] Profile ID:', profile.id);
        console.log('[Profile Init] Portal URL:', profile.portalUrl);
        console.log('[Profile Init] API URL:', profile.apiUrl);
        console.log('[Profile Init] CGI URL:', profile.cgiUrl);
        console.log('[Profile Init] Username:', profile.username || '(not set)');
        console.log('[Profile Init] Password:', profile.password ? `(set - ${profile.password.length} chars)` : '(not set)');
        console.log('[Profile Init] Has credentials:', !!(profile.username && profile.password));
        console.log('[Profile Init] Full profile data:', {
          id: profile.id,
          name: profile.name,
          portalUrl: profile.portalUrl,
          apiUrl: profile.apiUrl,
          cgiUrl: profile.cgiUrl,
          username: profile.username,
          hasPassword: !!profile.password,
          passwordLength: profile.password?.length,
          isDefault: profile.isDefault,
          createdAt: new Date(profile.createdAt).toLocaleString(),
          lastUsed: profile.lastUsed ? new Date(profile.lastUsed).toLocaleString() : 'never',
        });
        console.log('════════════════════════════════════════════════');

        // STEP 1: Clear any stale auth state and cache from previous sessions
        console.log('[Profile Init] Clearing stale auth and cache...');
        const { useAuthStore } = await import('./auth');
        useAuthStore.getState().logout();

        const { clearQueryCache } = await import('./query-cache');
        clearQueryCache();

        // STEP 2: Initialize API client for current profile
        console.log('[Profile Init] Initializing API client for:', profile.apiUrl);
        setApiClient(createApiClient(profile.apiUrl));

        // STEP 3: Authenticate if credentials exist
        if (profile.username && profile.password) {
          console.log('[Profile Init] Authenticating with stored credentials...');
          console.log('[Profile Init]   - Username:', profile.username);
          try {
            const { useAuthStore } = await import('./auth');
            await useAuthStore.getState().login(profile.username, profile.password);
            console.log('[Profile Init] ✓ Authentication successful on app load');
          } catch (error) {
            console.error('[Profile Init] ✗ Authentication failed on app load:', error);
            console.error('[Profile Init] This might be OK if the server doesn\'t require auth');
            // Don't crash the app - some servers work without auth
          }
        } else {
          console.log('[Profile Init] No credentials stored, skipping authentication');
          console.log('[Profile Init] ℹ This is normal for public servers like demo.zoneminder.com');
        }

        console.log('════════════════════════════════════════════════');
        console.log('[Profile Init] App initialization complete');
        console.log('════════════════════════════════════════════════');
      },
    }
  )
);
