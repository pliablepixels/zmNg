/**
 * Mobile Push Notifications Service
 *
 * Handles FCM push notifications for mobile platforms (iOS/Android)
 * Integrates with ZoneMinder event notification server
 */

import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type Token,
  type PushNotificationSchema,
  type ActionPerformed,
} from '@capacitor/push-notifications';
import { log } from '../lib/logger';
import { navigationService } from '../lib/navigation';
import { useNotificationStore } from '../stores/notifications';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';

export interface PushNotificationData {
  monitorId?: string;
  monitorName?: string;
  eventId?: string;
  cause?: string;
  imageUrl?: string;
}

export class MobilePushService {
  private isInitialized = false;
  private currentToken: string | null = null;

  /**
   * Initialize push notifications (mobile only)
   */
  public async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      log.info('Push notifications not available on web platform', { component: 'Push' });
      return;
    }

    log.info('Initializing push notifications', { component: 'Push' });

    try {
      // Request permission
      const permissionResult = await PushNotifications.requestPermissions();

      if (permissionResult.receive === 'granted') {
        log.info('Push notification permission granted', { component: 'Push' });

        // Setup listeners BEFORE registering to ensure we catch the registration event
        if (!this.isInitialized) {
          this._setupListeners();
          this.isInitialized = true;
        }

        // Always register with FCM on initialization to get the current token
        // This ensures we retrieve the token on every app start
        log.info('Calling PushNotifications.register()', { component: 'Push' });
        await PushNotifications.register();
        log.info('PushNotifications.register() called successfully', { component: 'Push' });

        log.info('Push notifications initialized successfully', { component: 'Push' });
      } else {
        log.warn('Push notification permission denied', {
          component: 'Push',
          receive: permissionResult.receive,
        });
      }
    } catch (error) {
      log.error('Failed to initialize push notifications', { component: 'Push' }, error);
      throw error;
    }
  }

  /**
   * Get current FCM token
   */
  public getToken(): string | null {
    return this.currentToken;
  }

  /**
   * Check if push notifications are initialized
   */
  public isReady(): boolean {
    return this.isInitialized && this.currentToken !== null;
  }

  /**
   * Register token with notification server if connected
   * Can be called after connection is established
   */
  public async registerTokenWithServer(): Promise<void> {
    if (!this.currentToken) {
      log.warn('No FCM token available to register', { component: 'Push' });
      return;
    }

    await this._registerWithServer(this.currentToken);
  }

  /**
   * Deregister from push notifications and notify server
   */
  public async deregister(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    if (!this.currentToken) {
      log.info('No FCM token to deregister', { component: 'Push' });
      return;
    }

    log.info('Deregistering from push notifications', { component: 'Push' });

    try {
      // Send disabled state to server if connected
      const notificationStore = useNotificationStore.getState();
      if (notificationStore.isConnected) {
        const platform = Capacitor.getPlatform() as 'ios' | 'android';
        log.info('Sending disabled state to notification server', { component: 'Push', platform });
        await notificationStore.deregisterPushToken(this.currentToken, platform);
      }

      // Unregister locally
      await this._unregister();
    } catch (error) {
      log.error('Failed to deregister from push notifications', { component: 'Push' }, error);
      throw error;
    }
  }

  /**
   * Unregister from push notifications (local only)
   */
  private async _unregister(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    log.info('Unregistering from push notifications locally', { component: 'Push' });

    try {
      // Remove all listeners
      await PushNotifications.removeAllListeners();

      // Clear token
      this.currentToken = null;
      this.isInitialized = false;

      log.info('Unregistered from push notifications', { component: 'Push' });
    } catch (error) {
      log.error('Failed to unregister from push notifications', { component: 'Push' }, error);
    }
  }

  // Single retry flag to prevent infinite retry loops
  private hasRetried = false;

  // ========== PRIVATE METHODS ==========

  private _setupListeners(): void {
    // Called when FCM token is received
    PushNotifications.addListener('registration', (token: Token) => {
      log.info('FCM token received', {
        component: 'Push',
        token: token.value.substring(0, 20) + '...', // Truncate for security
      });

      this.currentToken = token.value;
      this.hasRetried = false; // Reset retry flag on success

      // Register token with ZM notification server
      this._registerWithServer(token.value);
    });

    // Called when registration fails
    // Single retry after 5s delay to handle transient network issues on mobile
    PushNotifications.addListener('registrationError', (error) => {
      log.error('FCM registration failed', { component: 'Push' }, error);

      if (!this.hasRetried) {
        this.hasRetried = true;
        log.info('Retrying FCM registration once after 5s...', { component: 'Push' });

        setTimeout(async () => {
          try {
            await PushNotifications.register();
          } catch (e) {
            log.error('FCM registration retry failed', { component: 'Push' }, e);
          }
        }, 5000);
      }
    });

    // Called when notification is received while app is in foreground
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        log.info('Push notification received (foreground)', {
          component: 'Push',
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });

        // Handle the notification data
        this._handleNotification(notification);
      }
    );

    // Called when user taps on notification
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        log.info('Push notification action performed', {
          component: 'Push',
          actionId: action.actionId,
          notification: action.notification,
        });

        // Handle the tap action
        this._handleNotificationAction(action);
      }
    );
  }

  private async _registerWithServer(token: string): Promise<void> {
    const notificationStore = useNotificationStore.getState();

    if (!notificationStore.isConnected) {
      log.info('Storing FCM token - will register when connected to notification server', {
        component: 'Push',
      });
      return;
    }

    try {
      const platform = Capacitor.getPlatform() as 'ios' | 'android';

      log.info('Registering FCM token with notification server', {
        component: 'Push',
        platform,
      });

      await notificationStore.registerPushToken(token, platform);

      log.info('Successfully registered FCM token with server', { component: 'Push' });
    } catch (error) {
      log.error('Failed to register FCM token with server', { component: 'Push' }, error);
    }
  }

  /**
   * Handle incoming push notification when app is in foreground
   * This is called when a notification is received while the app is open
   */
  private _handleNotification(notification: PushNotificationSchema): void {
    const data = notification.data as PushNotificationData;

    log.info('Processing FCM notification (foreground)', {
      component: 'Push',
      title: notification.title,
      body: notification.body,
      data: notification.data,
    });

    // Extract event data and add to notification store
    if (data.monitorId && data.eventId) {
      const notificationStore = useNotificationStore.getState();

      // If we are connected to the event server, we will receive this event via WebSocket.
      // Ignore the push notification to avoid duplicate processing/toasts.
      // The WebSocket handler already adds the event to the store.
      if (notificationStore.isConnected) {
        log.info('Ignoring foreground push notification - already connected to event server', {
          component: 'Push',
          eventId: data.eventId,
        });
        return;
      }

      const profileId = notificationStore.currentProfileId;

      if (profileId) {
        // Construct image URL using the app's portal URL and auth token
        // Don't use the image URL from the server as it may have incorrect format
        let imageUrl: string | undefined;

        // Get current profile to construct proper image URL
        const profileStore = useProfileStore.getState();
        const currentProfile = profileStore.currentProfile();
        const authStore = useAuthStore.getState();

        if (currentProfile && authStore.accessToken) {
          imageUrl = `${currentProfile.portalUrl}/index.php?view=image&eid=${data.eventId}&fid=snapshot&width=600&token=${authStore.accessToken}`;

          log.info('Constructed image URL for FCM notification', {
            component: 'Push',
            eventId: data.eventId,
            imageUrl,
          });
        }

        notificationStore.addEvent(profileId, {
          MonitorId: parseInt(data.monitorId, 10),
          MonitorName: data.monitorName || 'Unknown',
          EventId: parseInt(data.eventId, 10),
          Cause: data.cause || notification.body || 'Motion detected',
          Name: data.monitorName || 'Unknown',
          ImageUrl: imageUrl,
        });
      }
    }
  }

  /**
   * Handle notification tap action
   * This is called when user taps on a push notification (app in background/killed)
   * Adds the event to notification history and navigates to event detail
   */
  private _handleNotificationAction(action: ActionPerformed): void {
    const data = action.notification.data as PushNotificationData;

    log.info('Processing notification tap', {
      component: 'Push',
      actionId: action.actionId,
      monitorId: data.monitorId,
      eventId: data.eventId,
    });

    // Add event to notification history and navigate if we have event ID
    if (data.eventId && data.monitorId) {
      const notificationStore = useNotificationStore.getState();
      const profileId = notificationStore.currentProfileId;

      if (profileId) {
        // Construct image URL using the app's portal URL and auth token
        let imageUrl: string | undefined;

        const profileStore = useProfileStore.getState();
        const currentProfile = profileStore.currentProfile();
        const authStore = useAuthStore.getState();

        if (currentProfile && authStore.accessToken) {
          imageUrl = `${currentProfile.portalUrl}/index.php?view=image&eid=${data.eventId}&fid=snapshot&width=600&token=${authStore.accessToken}`;
        }

        // Add event to notification history (duplicate prevention handled by store)
        // Event is added as unread initially
        notificationStore.addEvent(profileId, {
          MonitorId: parseInt(data.monitorId, 10),
          MonitorName: data.monitorName || 'Unknown',
          EventId: parseInt(data.eventId, 10),
          Cause: data.cause || action.notification.body || 'Motion detected',
          Name: data.monitorName || 'Unknown',
          ImageUrl: imageUrl,
        });

        // Mark as read since user is tapping to view the event
        notificationStore.markEventRead(profileId, parseInt(data.eventId, 10));

        log.info('Added notification to history from tap action and marked as read', {
          component: 'Push',
          eventId: data.eventId,
          profileId,
        });
      }

      // Navigate to event detail page
      navigationService.navigateToEvent(data.eventId);

      log.info('Navigating to event detail', { component: 'Push', eventId: data.eventId });
    }
  }
}

// Singleton instance
let pushService: MobilePushService | null = null;

export function getPushService(): MobilePushService {
  if (!pushService) {
    pushService = new MobilePushService();
  }
  return pushService;
}

export function resetPushService(): void {
  if (pushService) {
    // Use private _unregister to avoid sending disabled state to server during cleanup
    pushService['_unregister']().catch((error) => {
      log.error('Failed to unregister push service', { component: 'Push' }, error);
    });
    pushService = null;
  }
}
