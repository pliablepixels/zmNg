# Notifications

zmNg can notify you when ZoneMinder detects events. There are two notification methods:

## Web Notifications (Foreground)

When zmNg is open in the foreground, it connects to the ZoneMinder Event Notification Server via WebSocket and displays toast-style notifications for new events.

- Works on all platforms (web, desktop, mobile)
- No additional setup required beyond having the [Event Notification Server](https://github.com/pliablepixels/zmeventnotification) running
- Only active while the app is open

## Push Notifications (Mobile)

Native push notifications that work even when the app is closed or in the background. These use Firebase Cloud Messaging (FCM).

:::{important}
Push notifications require building the mobile app yourself with your own Firebase credentials. Pre-built binaries do not include push notification support. See the {doc}`../building/ANDROID` and {doc}`../building/IOS` build guides.
:::

### Requirements

1. A Firebase project with Cloud Messaging enabled
2. The [Event Notification Server](https://github.com/pliablepixels/zm_docker_macos) with direct FCM support
3. A custom-built zmNg mobile app with your Firebase credentials

### Setup

1. Create a Firebase project and enable Cloud Messaging
2. Download the `google-services.json` (Android) or `GoogleService-Info.plist` (iOS)
3. Place the file in the appropriate directory (see build guides)
4. Build the app
5. In zmNg Settings, enable push notifications
6. The app registers its FCM token with the Event Notification Server

### Per-Monitor Configuration

You can configure notifications per monitor:

- Enable or disable notifications for individual cameras
- Useful for ignoring high-traffic cameras that would generate too many alerts

## Notification History

zmNg keeps a history of the last 100 notifications received. Access it from the notification bell icon in the app header.

Each history entry shows:

- Monitor name
- Event timestamp
- Event thumbnail (if available)

Tap a notification entry to jump to the corresponding event.

## Troubleshooting

**No web notifications**
- Verify the Event Notification Server is running and accessible
- Check the browser console for WebSocket connection errors
- Ensure the server URL is correct in your profile settings

**No push notifications**
- Verify you built the app with your own Firebase credentials
- Check that the Event Notification Server has direct FCM support
- Verify the FCM token was registered (check app logs)
- On Android, check that battery optimization isn't killing the app in the background
