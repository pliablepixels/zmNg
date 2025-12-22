import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getNotificationService,
  resetNotificationService,
} from '../services/notifications';
import {
  type ZMEventServerConfig,
  type ZMAlarmEvent,
  type ConnectionState,
} from '../types/notifications';
import { log } from '../lib/logger';
import { useAuthStore } from './auth';
import { getAppVersion } from '../lib/version';

export interface NotificationSettings {
  enabled: boolean;
  host: string; // Event server host (e.g., "zm.example.com")
  port: number; // Event server port (default 9000)
  ssl: boolean; // Use wss:// instead of ws://
  monitorFilters: MonitorNotificationConfig[]; // Per-monitor settings
  showToasts: boolean; // Show toast notifications for events
  playSound: boolean; // Play sound on notification
  badgeCount: number; // Current unread count
}

export interface MonitorNotificationConfig {
  monitorId: number;
  enabled: boolean;
  checkInterval: number; // Seconds between checks (60, 120, etc.)
}

export interface NotificationEvent extends ZMAlarmEvent {
  receivedAt: number; // Timestamp when received
  read: boolean; // Whether user has seen it
}

interface NotificationState {
  // Settings per profile ID
  profileSettings: Record<string, NotificationSettings>;

  // Connection state (runtime only, not persisted)
  connectionState: ConnectionState;
  isConnected: boolean;
  currentProfileId: string | null; // Track which profile is connected

  // Events per profile ID
  profileEvents: Record<string, NotificationEvent[]>;

  // Internal runtime state (not persisted)
  _cleanupFunctions: (() => void)[];

  // Actions - Settings
  getProfileSettings: (profileId: string) => NotificationSettings;
  updateProfileSettings: (profileId: string, updates: Partial<NotificationSettings>) => void;
  setMonitorFilter: (profileId: string, monitorId: number, enabled: boolean, checkInterval?: number) => void;
  removeMonitorFilter: (profileId: string, monitorId: number) => void;

  // Actions - Connection
  connect: (profileId: string, username: string, password: string, portalUrl: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;

  // Actions - Events
  addEvent: (profileId: string, event: ZMAlarmEvent) => void;
  markEventRead: (profileId: string, eventId: number) => void;
  markAllRead: (profileId: string) => void;
  clearEvents: (profileId: string) => void;
  getUnreadCount: (profileId: string) => number;
  getEvents: (profileId: string) => NotificationEvent[];

  // Actions - Push (Mobile)
  registerPushToken: (token: string, platform: 'ios' | 'android') => Promise<void>;
  deregisterPushToken: (token: string, platform: 'ios' | 'android') => Promise<void>;

  // Internal
  _initialize: () => void;
  _cleanup: () => void;
  _syncMonitorFilters: () => Promise<void>;
  _updateBadge: () => Promise<void>;
  _registerPushTokenIfAvailable: () => Promise<void>;
}

const MAX_EVENTS = 100; // Keep last 100 events
const DEFAULT_PORT = 9000;

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  host: '',
  port: DEFAULT_PORT,
  ssl: true,
  monitorFilters: [],
  showToasts: true,
  playSound: false,
  badgeCount: 0,
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      profileSettings: {},
      connectionState: 'disconnected',
      isConnected: false,
      currentProfileId: null,
      profileEvents: {},
      _cleanupFunctions: [],

      // ========== Settings Actions ==========

      getProfileSettings: (profileId) => {
        const settings = get().profileSettings[profileId];
        return { ...DEFAULT_SETTINGS, ...settings };
      },

      updateProfileSettings: (profileId, updates) => {
        log.info('Updating notification settings', { component: 'Notifications', profileId, updates });

        set((state) => ({
          profileSettings: {
            ...state.profileSettings,
            [profileId]: {
              ...(state.profileSettings[profileId] || DEFAULT_SETTINGS),
              ...updates,
            },
          },
        }));

        // If enabled state changed to false, disconnect if this is the current profile
        if ('enabled' in updates && !updates.enabled && get().currentProfileId === profileId) {
          get().disconnect();
        }

        // If monitor filters changed and connected for this profile, update server
        if ('monitorFilters' in updates && get().isConnected && get().currentProfileId === profileId) {
          get()._syncMonitorFilters();
        }
      },

      setMonitorFilter: (profileId, monitorId, enabled, checkInterval = 60) => {
        log.info('Setting monitor filter', {
          component: 'Notifications',
          profileId,
          monitorId,
          enabled,
          checkInterval,
        });

        set((state) => {
          const profileSettings = state.profileSettings[profileId] || DEFAULT_SETTINGS;
          const existing = profileSettings.monitorFilters.find((f) => f.monitorId === monitorId);
          const filters = existing
            ? profileSettings.monitorFilters.map((f) =>
              f.monitorId === monitorId ? { ...f, enabled, checkInterval } : f
            )
            : [
              ...profileSettings.monitorFilters,
              { monitorId, enabled, checkInterval },
            ];

          return {
            profileSettings: {
              ...state.profileSettings,
              [profileId]: {
                ...profileSettings,
                monitorFilters: filters,
              },
            },
          };
        });

        // Update server if connected for this profile
        if (get().isConnected && get().currentProfileId === profileId) {
          get()._syncMonitorFilters();
        }
      },

      removeMonitorFilter: (profileId, monitorId) => {
        log.info('Removing monitor filter', { component: 'Notifications', profileId, monitorId });

        set((state) => {
          const profileSettings = state.profileSettings[profileId] || DEFAULT_SETTINGS;
          return {
            profileSettings: {
              ...state.profileSettings,
              [profileId]: {
                ...profileSettings,
                monitorFilters: profileSettings.monitorFilters.filter(
                  (f) => f.monitorId !== monitorId
                ),
              },
            },
          };
        });

        // Update server if connected for this profile
        if (get().isConnected && get().currentProfileId === profileId) {
          get()._syncMonitorFilters();
        }
      },

      // ========== Connection Actions ==========

      connect: async (profileId: string, username: string, password: string, portalUrl: string) => {
        const settings = get().getProfileSettings(profileId);

        if (!settings.enabled) {
          log.warn('Notifications not enabled for this profile', { component: 'Notifications', profileId });
          return;
        }

        if (!settings.host) {
          log.warn('No notification server host configured', { component: 'Notifications', profileId });
          return;
        }

        // Disconnect if already connected to a different profile
        if (get().isConnected && get().currentProfileId !== profileId) {
          log.info('Disconnecting from previous profile', {
            component: 'Notifications',
            previousProfile: get().currentProfileId,
            newProfile: profileId
          });
          get().disconnect();
        }

        log.info('Connecting to notification server', {
          component: 'Notifications',
          profileId,
          host: settings.host,
          port: settings.port,
          ssl: settings.ssl,
        });

        const config: ZMEventServerConfig = {
          host: settings.host,
          port: settings.port,
          ssl: settings.ssl,
          username,
          password,
          token: useAuthStore.getState().accessToken || undefined,
          appVersion: getAppVersion(),
          portalUrl,
        };

        const service = getNotificationService();

        // Setup listeners before connecting
        get()._initialize();

        try {
          await service.connect(config);

          // Mark which profile is connected
          set({ currentProfileId: profileId });

          // Sync monitor filters after connection
          get()._syncMonitorFilters();

          log.info('Successfully connected to notification server', {
            component: 'Notifications',
            profileId,
          });

          // Register push token if on mobile and token is available
          get()._registerPushTokenIfAvailable();
        } catch (error) {
          log.error('Failed to connect to notification server', { component: 'Notifications', profileId }, error);
          throw error;
        }
      },

      disconnect: () => {
        log.info('Disconnecting from notification server', {
          component: 'Notifications',
          profileId: get().currentProfileId
        });

        get()._cleanup();
        resetNotificationService();

        set({
          connectionState: 'disconnected',
          isConnected: false,
          currentProfileId: null,
        });
      },

      reconnect: async () => {
        log.info('Reconnecting to notification server', { component: 'Notifications' });
        // Disconnect first, then user must call connect with credentials
        get().disconnect();
      },

      // ========== Event Actions ==========

      getEvents: (profileId) => {
        return get().profileEvents[profileId] || [];
      },

      getUnreadCount: (profileId) => {
        const events = get().profileEvents[profileId] || [];
        return events.filter((e) => !e.read).length;
      },

      /**
       * Add notification event to history
       * Events can come from WebSocket (when connected) or FCM push notifications
       * Duplicate prevention: if an event with the same ID already exists, it will be replaced
       */
      addEvent: (profileId: string, event: ZMAlarmEvent) => {
        log.info('Adding notification event', {
          component: 'Notifications',
          profileId,
          monitor: event.MonitorName,
          eventId: event.EventId,
        });

        set((state) => {
          const notificationEvent: NotificationEvent = {
            ...event,
            receivedAt: Date.now(),
            read: false,
          };

          const currentEvents = state.profileEvents[profileId] || [];

          // Remove any existing event with the same ID to avoid duplicates
          // This prevents duplicate entries when receiving the same event from both WebSocket and FCM
          const otherEvents = currentEvents.filter(e => e.EventId !== event.EventId);

          const events = [notificationEvent, ...otherEvents].slice(0, MAX_EVENTS);
          const unreadCount = events.filter((e) => !e.read).length;

          const profileSettings = state.profileSettings[profileId] || DEFAULT_SETTINGS;

          return {
            profileEvents: {
              ...state.profileEvents,
              [profileId]: events,
            },
            profileSettings: {
              ...state.profileSettings,
              [profileId]: {
                ...profileSettings,
                badgeCount: unreadCount,
              },
            },
          };
        });
      },

      markEventRead: (profileId: string, eventId: number) => {
        set((state) => {
          const currentEvents = state.profileEvents[profileId] || [];
          const events = currentEvents.map((e) =>
            e.EventId === eventId ? { ...e, read: true } : e
          );
          const unreadCount = events.filter((e) => !e.read).length;

          const profileSettings = state.profileSettings[profileId] || DEFAULT_SETTINGS;

          return {
            profileEvents: {
              ...state.profileEvents,
              [profileId]: events,
            },
            profileSettings: {
              ...state.profileSettings,
              [profileId]: {
                ...profileSettings,
                badgeCount: unreadCount,
              },
            },
          };
        });

        // Update badge on server if this is the connected profile
        if (get().currentProfileId === profileId) {
          get()._updateBadge();
        }
      },

      markAllRead: (profileId: string) => {
        set((state) => {
          const currentEvents = state.profileEvents[profileId] || [];
          const events = currentEvents.map((e) => ({ ...e, read: true }));
          const profileSettings = state.profileSettings[profileId] || DEFAULT_SETTINGS;

          return {
            profileEvents: {
              ...state.profileEvents,
              [profileId]: events,
            },
            profileSettings: {
              ...state.profileSettings,
              [profileId]: {
                ...profileSettings,
                badgeCount: 0,
              },
            },
          };
        });

        // Update badge on server if this is the connected profile
        if (get().currentProfileId === profileId) {
          get()._updateBadge();
        }
      },

      clearEvents: (profileId: string) => {
        log.info('Clearing all notification events', { component: 'Notifications', profileId });

        set((state) => {
          const profileSettings = state.profileSettings[profileId] || DEFAULT_SETTINGS;

          return {
            profileEvents: {
              ...state.profileEvents,
              [profileId]: [],
            },
            profileSettings: {
              ...state.profileSettings,
              [profileId]: {
                ...profileSettings,
                badgeCount: 0,
              },
            },
          };
        });

        // Update badge on server if this is the connected profile
        if (get().currentProfileId === profileId) {
          get()._updateBadge();
        }
      },

      // ========== Push Token Actions ==========

      registerPushToken: async (token: string, platform: 'ios' | 'android') => {
        const { isConnected, currentProfileId } = get();

        if (!isConnected || !currentProfileId) {
          log.warn('Cannot register push token - not connected', { component: 'Notifications' });
          return;
        }

        log.info('Registering push token', { component: 'Notifications', platform, profileId: currentProfileId });

        const service = getNotificationService();
        const settings = get().getProfileSettings(currentProfileId);
        const { monitorFilters } = settings;

        const enabledFilters = monitorFilters.filter((f) => f.enabled);
        const monitorIds = enabledFilters.map((f) => f.monitorId);
        const intervals = enabledFilters.map((f) => f.checkInterval);

        await service.registerPushToken(token, platform, monitorIds, intervals);
      },

      deregisterPushToken: async (token: string, platform: 'ios' | 'android') => {
        const { isConnected, currentProfileId } = get();

        if (!isConnected || !currentProfileId) {
          log.warn('Cannot deregister push token - not connected', { component: 'Notifications' });
          return;
        }

        log.info('Deregistering push token', { component: 'Notifications', platform, profileId: currentProfileId });

        const service = getNotificationService();
        await service.deregisterPushToken(token, platform);
      },

      // ========== Internal Methods ==========

      _initialize: () => {
        const service = getNotificationService();

        // Listen for connection state changes
        const unsubscribeState = service.onStateChange((state) => {
          log.info('Connection state changed', { component: 'Notifications', state });
          set({
            connectionState: state,
            isConnected: state === 'connected',
          });
        });

        // Listen for alarm events
        const unsubscribeEvents = service.onEvent((event) => {
          const { currentProfileId } = get();
          if (currentProfileId) {
            get().addEvent(currentProfileId, event);

            const settings = get().getProfileSettings(currentProfileId);

            // Show toast if enabled
            if (settings.showToasts) {
              // Toast will be shown by the UI component listening to the store
            }

            // Play sound if enabled
            if (settings.playSound) {
              log.info('Playing notification sound', { component: 'Notifications' });
            }
          }
        });

        // Store cleanup functions in state instead of window object
        set({
          _cleanupFunctions: [unsubscribeState, unsubscribeEvents],
        });
      },

      _cleanup: () => {
        const { _cleanupFunctions } = get();
        if (_cleanupFunctions && _cleanupFunctions.length > 0) {
          _cleanupFunctions.forEach((fn) => fn());
          set({ _cleanupFunctions: [] });
        }
      },

      _syncMonitorFilters: async () => {
        const { currentProfileId } = get();
        if (!currentProfileId) {
          log.warn('Cannot sync monitor filters - no profile connected', { component: 'Notifications' });
          return;
        }

        const service = getNotificationService();
        const settings = get().getProfileSettings(currentProfileId);
        const { monitorFilters } = settings;

        const enabledFilters = monitorFilters.filter((f) => f.enabled);
        if (enabledFilters.length === 0) {
          log.info('No enabled monitor filters to sync', { component: 'Notifications', profileId: currentProfileId });
          return;
        }

        const monitorIds = enabledFilters.map((f) => f.monitorId);
        const intervals = enabledFilters.map((f) => f.checkInterval);

        log.info('Syncing monitor filters with server', {
          component: 'Notifications',
          profileId: currentProfileId,
          monitors: monitorIds,
          intervals,
        });

        try {
          await service.setMonitorFilter(monitorIds, intervals);
        } catch (error) {
          log.error('Failed to sync monitor filters', { component: 'Notifications', profileId: currentProfileId }, error);
        }
      },

      _updateBadge: async () => {
        const { currentProfileId } = get();
        if (!currentProfileId) {
          log.warn('Cannot update badge - no profile connected', { component: 'Notifications' });
          return;
        }

        const service = getNotificationService();
        const settings = get().getProfileSettings(currentProfileId);
        const { badgeCount } = settings;

        try {
          await service.updateBadgeCount(badgeCount);
        } catch (error) {
          log.error('Failed to update badge count', { component: 'Notifications', profileId: currentProfileId }, error);
        }
      },

      _registerPushTokenIfAvailable: async () => {
        // Only runs on mobile platforms
        if (typeof window === 'undefined') {
          return;
        }

        try {
          const { Capacitor } = await import('@capacitor/core');
          if (!Capacitor.isNativePlatform()) {
            return;
          }

          const { getPushService } = await import('../services/pushNotifications');
          const pushService = getPushService();

          if (pushService.isReady()) {
            log.info('Registering FCM token after connection', { component: 'Notifications' });
            await pushService.registerTokenWithServer();
          } else {
            log.info('FCM token not yet available - will register when received', { component: 'Notifications' });
          }
        } catch (error) {
          log.error('Failed to register push token', { component: 'Notifications' }, error);
        }
      },
    }),
    {
      name: 'zmng-notifications',
      // Only persist settings and events, not connection state
      partialize: (state) => ({
        profileSettings: state.profileSettings,
        profileEvents: state.profileEvents,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const profileCount = Object.keys(state.profileSettings || {}).length;
          const eventCounts = Object.entries(state.profileEvents || {}).map(
            ([id, events]) => `${id}: ${events.length}`
          );
          log.info('Notification store rehydrated', {
            component: 'Notifications',
            profileCount,
            eventCounts,
          });
        }
      },
    }
  )
);
