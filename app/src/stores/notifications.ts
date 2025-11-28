import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getNotificationService,
  resetNotificationService,
  type ZMEventServerConfig,
  type ZMAlarmEvent,
  type ConnectionState,
} from '../services/notifications';
import { log } from '../lib/logger';

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
  // Settings
  settings: NotificationSettings;

  // Connection state
  connectionState: ConnectionState;
  isConnected: boolean;

  // Events
  events: NotificationEvent[]; // Recent events (last 100)
  unreadCount: number;

  // Internal runtime state (not persisted)
  _cleanupFunctions: (() => void)[];

  // Actions - Settings
  updateSettings: (updates: Partial<NotificationSettings>) => void;
  setMonitorFilter: (monitorId: number, enabled: boolean, checkInterval?: number) => void;
  removeMonitorFilter: (monitorId: number) => void;

  // Actions - Connection
  connect: (username: string, password: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;

  // Actions - Events
  addEvent: (event: ZMAlarmEvent) => void;
  markEventRead: (eventId: number) => void;
  markAllRead: () => void;
  clearEvents: () => void;

  // Actions - Push (Mobile)
  registerPushToken: (token: string, platform: 'ios' | 'android') => Promise<void>;

  // Internal
  _initialize: () => void;
  _cleanup: () => void;
  _syncMonitorFilters: () => Promise<void>;
  _updateBadge: () => Promise<void>;
}

const MAX_EVENTS = 100; // Keep last 100 events
const DEFAULT_PORT = 9000;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      settings: {
        enabled: false,
        host: '',
        port: DEFAULT_PORT,
        ssl: true,
        monitorFilters: [],
        showToasts: true,
        playSound: false,
        badgeCount: 0,
      },
      connectionState: 'disconnected',
      isConnected: false,
      events: [],
      unreadCount: 0,
      _cleanupFunctions: [],

      // ========== Settings Actions ==========

      updateSettings: (updates) => {
        log.info('Updating notification settings', { component: 'Notifications', updates });

        set((state) => ({
          settings: {
            ...state.settings,
            ...updates,
          },
        }));

        // If enabled state changed, connect/disconnect
        if ('enabled' in updates) {
          if (updates.enabled) {
            // Will connect when credentials are available (via connect method)
            log.info('Notifications enabled - call connect() with credentials', {
              component: 'Notifications',
            });
          } else {
            get().disconnect();
          }
        }

        // If monitor filters changed and connected, update server
        if ('monitorFilters' in updates && get().isConnected) {
          get()._syncMonitorFilters();
        }
      },

      setMonitorFilter: (monitorId, enabled, checkInterval = 60) => {
        log.info('Setting monitor filter', {
          component: 'Notifications',
          monitorId,
          enabled,
          checkInterval,
        });

        set((state) => {
          const existing = state.settings.monitorFilters.find((f) => f.monitorId === monitorId);
          const filters = existing
            ? state.settings.monitorFilters.map((f) =>
                f.monitorId === monitorId ? { ...f, enabled, checkInterval } : f
              )
            : [
                ...state.settings.monitorFilters,
                { monitorId, enabled, checkInterval },
              ];

          return {
            settings: {
              ...state.settings,
              monitorFilters: filters,
            },
          };
        });

        // Update server if connected
        if (get().isConnected) {
          get()._syncMonitorFilters();
        }
      },

      removeMonitorFilter: (monitorId) => {
        log.info('Removing monitor filter', { component: 'Notifications', monitorId });

        set((state) => ({
          settings: {
            ...state.settings,
            monitorFilters: state.settings.monitorFilters.filter(
              (f) => f.monitorId !== monitorId
            ),
          },
        }));

        // Update server if connected
        if (get().isConnected) {
          get()._syncMonitorFilters();
        }
      },

      // ========== Connection Actions ==========

      connect: async (username: string, password: string) => {
        const { settings } = get();

        if (!settings.enabled) {
          log.warn('Notifications not enabled', { component: 'Notifications' });
          return;
        }

        if (!settings.host) {
          log.warn('No notification server host configured', { component: 'Notifications' });
          return;
        }

        log.info('Connecting to notification server', {
          component: 'Notifications',
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
          appVersion: '1.0.0', // TODO: Get from package.json
        };

        const service = getNotificationService();

        // Setup listeners before connecting
        get()._initialize();

        try {
          await service.connect(config);

          // Sync monitor filters after connection
          get()._syncMonitorFilters();

          log.info('Successfully connected to notification server', {
            component: 'Notifications',
          });
        } catch (error) {
          log.error('Failed to connect to notification server', { component: 'Notifications' }, error);
          throw error;
        }
      },

      disconnect: () => {
        log.info('Disconnecting from notification server', { component: 'Notifications' });

        get()._cleanup();
        resetNotificationService();

        set({
          connectionState: 'disconnected',
          isConnected: false,
        });
      },

      reconnect: async () => {
        log.info('Reconnecting to notification server', { component: 'Notifications' });
        // Disconnect first, then user must call connect with credentials
        get().disconnect();
      },

      // ========== Event Actions ==========

      addEvent: (event: ZMAlarmEvent) => {
        log.info('Adding notification event', {
          component: 'Notifications',
          monitor: event.MonitorName,
          eventId: event.EventId,
        });

        set((state) => {
          const notificationEvent: NotificationEvent = {
            ...event,
            receivedAt: Date.now(),
            read: false,
          };

          const events = [notificationEvent, ...state.events].slice(0, MAX_EVENTS);
          const unreadCount = events.filter((e) => !e.read).length;

          return {
            events,
            unreadCount,
            settings: {
              ...state.settings,
              badgeCount: unreadCount,
            },
          };
        });
      },

      markEventRead: (eventId: number) => {
        set((state) => {
          const events = state.events.map((e) =>
            e.EventId === eventId ? { ...e, read: true } : e
          );
          const unreadCount = events.filter((e) => !e.read).length;

          return {
            events,
            unreadCount,
            settings: {
              ...state.settings,
              badgeCount: unreadCount,
            },
          };
        });

        // Update badge on server
        get()._updateBadge();
      },

      markAllRead: () => {
        set((state) => ({
          events: state.events.map((e) => ({ ...e, read: true })),
          unreadCount: 0,
          settings: {
            ...state.settings,
            badgeCount: 0,
          },
        }));

        // Update badge on server
        get()._updateBadge();
      },

      clearEvents: () => {
        log.info('Clearing all notification events', { component: 'Notifications' });
        set({
          events: [],
          unreadCount: 0,
          settings: {
            ...get().settings,
            badgeCount: 0,
          },
        });

        // Update badge on server
        get()._updateBadge();
      },

      // ========== Push Token Actions ==========

      registerPushToken: async (token: string, platform: 'ios' | 'android') => {
        if (!get().isConnected) {
          log.warn('Cannot register push token - not connected', { component: 'Notifications' });
          return;
        }

        log.info('Registering push token', { component: 'Notifications', platform });

        const service = getNotificationService();
        const { monitorFilters } = get().settings;

        const enabledFilters = monitorFilters.filter((f) => f.enabled);
        const monitorIds = enabledFilters.map((f) => f.monitorId);
        const intervals = enabledFilters.map((f) => f.checkInterval);

        await service.registerPushToken(token, platform, monitorIds, intervals);
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
          get().addEvent(event);

          // Show toast if enabled
          if (get().settings.showToasts) {
            // Toast will be shown by the UI component listening to the store
          }

          // Play sound if enabled
          if (get().settings.playSound) {
            // TODO: Play notification sound
            log.info('Playing notification sound', { component: 'Notifications' });
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
        const service = getNotificationService();
        const { monitorFilters } = get().settings;

        const enabledFilters = monitorFilters.filter((f) => f.enabled);
        if (enabledFilters.length === 0) {
          log.info('No enabled monitor filters to sync', { component: 'Notifications' });
          return;
        }

        const monitorIds = enabledFilters.map((f) => f.monitorId);
        const intervals = enabledFilters.map((f) => f.checkInterval);

        log.info('Syncing monitor filters with server', {
          component: 'Notifications',
          monitors: monitorIds,
          intervals,
        });

        try {
          await service.setMonitorFilter(monitorIds, intervals);
        } catch (error) {
          log.error('Failed to sync monitor filters', { component: 'Notifications' }, error);
        }
      },

      _updateBadge: async () => {
        const service = getNotificationService();
        const { badgeCount } = get().settings;

        try {
          await service.updateBadgeCount(badgeCount);
        } catch (error) {
          log.error('Failed to update badge count', { component: 'Notifications' }, error);
        }
      },
    }),
    {
      name: 'zmng-notifications',
      // Only persist settings and events, not connection state
      partialize: (state) => ({
        settings: state.settings,
        events: state.events,
        unreadCount: state.unreadCount,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          log.info('Notification store rehydrated', {
            component: 'Notifications',
            enabled: state.settings.enabled,
            host: state.settings.host,
            eventCount: state.events.length,
            unreadCount: state.unreadCount,
          });
        }
      },
    }
  )
);
