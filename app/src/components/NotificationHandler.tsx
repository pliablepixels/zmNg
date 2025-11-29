/**
 * Notification Handler Component
 *
 * Listens to the notification store and displays toast notifications
 * Also handles auto-connecting to notification server when profile loads
 */

import { useEffect, useRef } from 'react';
import { useNotificationStore } from '../stores/notifications';
import { useProfileStore } from '../stores/profile';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { log } from '../lib/logger';
import { useTranslation } from 'react-i18next';

export function NotificationHandler() {
  const currentProfile = useProfileStore((state) => state.currentProfile());
  const getDecryptedPassword = useProfileStore((state) => state.getDecryptedPassword);
  const { t } = useTranslation();

  const {
    settings,
    events,
    isConnected,
    connect,
  } = useNotificationStore();

  const lastEventId = useRef<number | null>(null);
  const hasAttemptedAutoConnect = useRef(false);

  // Auto-connect when profile loads (if enabled)
  useEffect(() => {
    if (
      settings.enabled &&
      !isConnected &&
      currentProfile &&
      currentProfile.username &&
      currentProfile.password &&
      !hasAttemptedAutoConnect.current
    ) {
      hasAttemptedAutoConnect.current = true;

      log.info('Auto-connecting to notification server', { component: 'Notifications' });

      getDecryptedPassword(currentProfile.id)
        .then((password) => {
          if (password) {
            return connect(currentProfile.username!, password);
          } else {
            throw new Error('Failed to get password');
          }
        })
        .then(() => {
          log.info('Auto-connected to notification server', { component: 'Notifications' });
        })
        .catch((error) => {
          log.error('Auto-connect failed', { component: 'Notifications' }, error);
          // Don't show error toast for auto-connect failures
        });
    }
  }, [settings.enabled, isConnected, currentProfile, connect, getDecryptedPassword]);

  // Reset auto-connect flag when profile changes
  useEffect(() => {
    hasAttemptedAutoConnect.current = false;
  }, [currentProfile?.id]);

  // Listen for new events and show toasts
  useEffect(() => {
    if (!settings.showToasts || events.length === 0) {
      return;
    }

    const latestEvent = events[0];

    // Only show toast if this is a new event we haven't seen
    if (latestEvent.EventId !== lastEventId.current) {
      lastEventId.current = latestEvent.EventId;

      // Show toast notification
      toast(
        <div className="flex items-start gap-3">
          {latestEvent.ImageUrl ? (
            <div className="flex-shrink-0">
              <img
                src={latestEvent.ImageUrl}
                alt={latestEvent.MonitorName}
                className="h-16 w-16 rounded object-cover border"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  const icon = e.currentTarget.nextElementSibling as HTMLElement;
                  if (icon) icon.style.display = 'block';
                }}
              />
              <div style={{ display: 'none' }} className="mt-0.5">
                <Bell className="h-5 w-5 text-primary" />
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 mt-0.5">
              <Bell className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{latestEvent.MonitorName}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{latestEvent.Cause}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t('events.event_id')}: {latestEvent.EventId}
            </div>
          </div>
        </div>,
        {
          duration: 5000,
          action: latestEvent.EventId
            ? {
                label: t('common.view'),
                onClick: () => {
                  // Navigate to event detail
                  window.location.href = `/events/${latestEvent.EventId}`;
                },
              }
            : undefined,
        }
      );

      // Play sound if enabled
      if (settings.playSound) {
        playNotificationSound();
      }

      log.info('Showed notification toast', {
        component: 'Notifications',
        monitor: latestEvent.MonitorName,
        eventId: latestEvent.EventId,
      });
    }
  }, [events, settings.showToasts, settings.playSound, t]);

  // This component doesn't render anything
  return null;
}

/**
 * Play notification sound
 */
function playNotificationSound() {
  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // 800 Hz tone
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    log.error('Failed to play notification sound', { component: 'Notifications' }, error);
  }
}
