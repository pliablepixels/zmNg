# zmNg - Modern ZoneMinder Client

[View Comparison with zmNinja](notes/COMPARISON.md)

A modern web and mobile application for ZoneMinder NVR systems, providing a clean, intuitive interface for viewing live camera feeds, reviewing events, and managing multiple server profiles. It is a ground-up rewrite of the original [zmNinja](https://zmninja.zoneminder.com/) application, using modern web technologies and a more intuitive user interface. The code was 99% Claude CLI generated.

### Screenshots

| | |
|---|---|
| <img src="images/1.png" width="400" alt="Montage View"> | <img src="images/2.png" width="400" alt="Events View"> |
| <img src="images/3.png" width="400" alt="Event Detail"> | <img src="images/4.png" width="400" alt="Timeline"> |

<details>
<summary>More Screenshots</summary>

<img src="images/5.png" width="250" alt="Monitor Detail"> <img src="images/6.png" width="250" alt="Settings"> <img src="images/7.png" width="250" alt="Profile Switcher"> <img src="images/8.png" width="250" alt="Notifications">

</details>

## Quick Start

```bash
cd app
npm install

# Desktop development (with CORS proxy)
npm run dev:all

# Android development
npm run android
```

📱 **For detailed Android guide, see [ANDROID.md](app/ANDROID.md)**

## Features

### Multi-Profile Management
- Add multiple ZoneMinder servers with independent configurations
- Seamless switching between profiles
- **Encrypted credential storage** using AES-GCM encryption
- Automatic token refresh with proper lifecycle management
- Smart URL detection (portal, API, and CGI endpoints)
- Profile-specific settings and layouts

### Live Camera Views
- **Montage** - Customizable grid layout with drag-and-drop positioning
- **Cameras** - List/grid view with live thumbnails
- **Monitor Detail** - Full-screen single camera view
- Snapshot mode (recommended) or streaming mode
- Configurable refresh intervals for snapshot mode

### Event Management
- **Events** - Paginated list with filtering by camera, date range, and event type
- **Event Montage** - Grid view of event thumbnails with advanced filters
- **Event Detail** - Full playback with metadata
- **Timeline** - Visual timeline of events across cameras

### Smart Settings
- **Profile-specific settings** - Each server maintains its own configuration
- **View mode toggle** - Choose between snapshot (lower bandwidth) or streaming
- **Layout persistence** - Montage layouts saved per profile
- **Automatic token management** - Silent refresh before expiration

### Push Notifications
- **Real-time alarm events** - Get notified when motion/events are detected
- **WebSocket connection** - Direct connection to ZoneMinder event server (desktop & mobile foreground)
- **FCM support** - Firebase Cloud Messaging for mobile background notifications
- **Rich notifications** - Event images displayed in toasts and history
- **Monitor filtering** - Choose which cameras trigger notifications
- **Notification history** - View last 100 events with unread tracking
- **Mock server included** - Test notifications without ZM server setup


## Prerequisites
- Node.js 18+ and npm
- For Android: Android SDK, `ANDROID_HOME` env var, and an AVD configured

## Development

### Desktop (Web)
```bash
# Start dev server with CORS proxy (required for external ZoneMinder servers)
npm run dev:all
```
- App: `http://localhost:5173`
- Proxy: `http://localhost:3001`

### Android
```bash
# Build, sync, and run on emulator/device
npm run android

# View logs
npm run android:logs

# Check connected devices
npm run android:devices
```

### Testing

**Unit Tests (Vitest)**
```bash
npm run test:unit       # Run unit tests once (CI)
npm test                # Run in watch mode
npm run test:coverage   # Generate coverage report
```
Current coverage: 28 passing tests (notification service & store)

**E2E Tests (Playwright)**
```bash
npm run test:e2e        # Run all E2E tests
npm run test:e2e:ui     # Run with Playwright UI
npm run test:e2e:notifications  # Test notification system only
```

**Testing Notifications Without ZM Server**
```bash
# Start mock WebSocket server + dev server + proxy
npm run dev:notifications

# Or mock server only
npm run mock:notifications
```

The mock server simulates the ZoneMinder event notification server:
- Runs on `ws://localhost:9000`
- Accepts any username/password
- Sends fake alarms every 10 seconds
- Includes realistic event images
- Perfect for testing without full ZM setup

To test:
1. Start mock server (see above)
2. Open app at http://localhost:5173
3. Go to Notifications settings
4. Set host: `localhost`, port: `9000`, SSL: OFF
5. Click "Connect" with any credentials
6. Watch notifications appear!

## Production Builds

### Web
```bash
npm run build          # Build to dist/
npm run preview        # Preview production build
```

Deploy `dist/` to: Netlify, Vercel, GitHub Pages, AWS S3, etc.

### Android

**See [ANDROID.md](app/ANDROID.md) for complete release build instructions including:**
- Keystore generation and signing configuration
- Building APK/AAB for release
- Publishing to Google Play Store

**Quick reference:**
```bash
npm run android:sync      # Build and sync web assets
npm run android:release   # Build release APK
npm run android:bundle    # Build AAB for Play Store
```

Output files:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

## Test Servers

1. **demo.zoneminder.com** - No authentication required but its not a great server. Cameras are finicky
2. **zm.connortechnology.com** -  (Username & Password required)

> [!NOTE]
> To run tests against the secure server, create a `.env` file in the `app` directory with:
> ```
> ZM_SECURE_HOST=your_ZM_server
> ZM_SECURE_USER=your_ZM_user
> ZM_SECURE_PASSWORD=your_password_here
> ```


## Tech Stack

- **Frontend**: React 19 + TypeScript 5
- **Build Tool**: Vite 6
- **Mobile**: Capacitor 7 (cross-platform native runtime)
- **Styling**: TailwindCSS 4 + shadcn/ui components
- **State Management**: Zustand with persistence
- **Data Fetching**: TanStack Query (React Query)
- **HTTP Client**: Axios with interceptors + Capacitor HTTP (native)
- **Routing**: React Router v7
- **Security**: Web Crypto API for AES-GCM encryption
- **Logging**: Custom structured logging system with levels
- **Testing**: Playwright for E2E
- **Layout**: react-grid-layout for drag-and-drop montage
- **Timeline**: vis-timeline for event visualization

## Architecture

### State Management
- **Profile Store** (`stores/profile.ts`) - Manages server profiles and encrypted credentials
- **Auth Store** (`stores/auth.ts`) - Handles authentication and token lifecycle
- **Settings Store** (`stores/settings.ts`) - Profile-specific user preferences
- **Monitor Store** (`stores/monitors.ts`) - Connection key management for streams

### Utilities & Infrastructure
- **Crypto** (`lib/crypto.ts`) - AES-GCM encryption/decryption for passwords
- **Logger** (`lib/logger.ts`) - Structured logging with DEBUG/INFO/WARN/ERROR levels
- **Filters** (`lib/filters.ts`) - Monitor and event filtering utilities
- **Constants** (`lib/constants.ts`) - Centralized app configuration

### Custom Hooks
- **useMonitorStream** (`hooks/useMonitorStream.ts`) - Stream URL management and cleanup
- **useEventFilters** (`hooks/useEventFilters.ts`) - Event filtering with URL synchronization
- **useTokenRefresh** (`hooks/useTokenRefresh.ts`) - Automatic token refresh with proper lifecycle

### API Layer
- **API Client** (`api/client.ts`) - Axios instance with automatic token injection and logging
  - Uses proxy server in web development mode
  - Uses Capacitor native HTTP on mobile to bypass CORS
  - Direct requests in web production mode
- **Monitor API** (`api/monitors.ts`) - Camera listing and stream URL generation
- **Event API** (`api/events.ts`) - Event queries, filtering, and image URLs
- **Auth API** (`api/auth.ts`) - Login and token refresh

### Components
- **ErrorBoundary** (`components/ErrorBoundary.tsx`) - Graceful error handling
- **MonitorCard** (`components/monitors/MonitorCard.tsx`) - Reusable camera card
- **EventCard** (`components/events/EventCard.tsx`) - Reusable event card
- **UI Components** (`components/ui/`) - shadcn/ui component library

### Key Features Implementation

#### Snapshot vs Streaming Mode
- **Snapshot Mode**: Fetches single JPEG frames at regular intervals (default 3 seconds)
  - Lower bandwidth usage
  - Better for multiple cameras
  - Preloading prevents flickering
- **Streaming Mode**: MJPEG streams for smoother video
  - Higher bandwidth
  - Limited by browser connection limits (6 concurrent per domain)

#### Connection Management
- Unique connection keys (`connkey`) per stream to manage browser connection limits
- Proper cleanup on component unmount to release connections
- Auto-reconnect with exponential backoff on failures

#### Layout Persistence
- Montage layouts stored per profile in localStorage
- Responsive grid system with multiple breakpoints
- Automatic handling of added/removed cameras

## Project Structure

```
src/
├── api/                  # API client and service modules
│   ├── client.ts        # Axios instance with interceptors
│   ├── auth.ts          # Authentication endpoints
│   ├── monitors.ts      # Monitor/camera endpoints
│   ├── events.ts        # Event endpoints
│   └── types.ts         # TypeScript types and Zod schemas
├── components/
│   ├── ErrorBoundary.tsx # Error boundary wrapper
│   ├── layout/          # AppLayout with sidebar navigation
│   ├── monitors/        # Monitor-specific components
│   │   └── MonitorCard.tsx
│   ├── events/          # Event-specific components
│   │   └── EventCard.tsx
│   └── ui/              # shadcn/ui components
├── hooks/               # Custom React hooks
│   ├── useMonitorStream.ts
│   ├── useEventFilters.ts
│   └── useTokenRefresh.ts
├── lib/                 # Utilities and infrastructure
│   ├── crypto.ts        # Password encryption/decryption
│   ├── logger.ts        # Structured logging system
│   ├── constants.ts     # Centralized app constants
│   ├── filters.ts       # Monitor/event filtering utilities
│   └── utils.ts         # General utilities
├── pages/               # Route components
│   ├── Montage.tsx      # Live camera grid
│   ├── Monitors.tsx     # Camera list/grid
│   ├── MonitorDetail.tsx # Single camera view
│   ├── Events.tsx       # Event list
│   ├── EventMontage.tsx # Event grid
│   ├── EventDetail.tsx  # Single event playback
│   ├── Timeline.tsx     # Visual event timeline
│   ├── Profiles.tsx     # Server management
│   └── Settings.tsx     # User preferences
├── stores/              # Zustand state stores
│   ├── profile.ts       # Profile management
│   ├── auth.ts          # Authentication state
│   ├── settings.ts      # User settings
│   └── monitors.ts      # Monitor state
└── styles/              # Global styles and timeline CSS
```

## Code Quality & Security

### Password Encryption
All user passwords are encrypted before being stored in localStorage using:
- **Algorithm**: AES-GCM (256-bit encryption)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt**: App-specific + device-specific entropy
- **Auto-decryption**: Passwords decrypted on-demand for authentication

> **Note**: Passwords use device-specific entropy, so won't decrypt on different devices. This is intentional for security. Users need to re-enter passwords on new devices.

### Type Safety
- **100% type-safe** - No critical `any` types in codebase
- TypeScript strict mode enabled
- Zod schemas for runtime validation of API responses
- Proper error types throughout

### Logging
- **Structured logging** with configurable log levels (DEBUG, INFO, WARN, ERROR)
- Development: Shows detailed logs
- Production: Can be configured to show only warnings and errors
- All sensitive data (passwords) masked in logs

### Error Handling
- **ErrorBoundary** component catches React errors gracefully
- Shows user-friendly error UI instead of blank screen
- Logs errors for debugging
- "Try Again" and "Reload" options for recovery

### Performance
- **Memoization** for expensive computations (filters, lists)
- **Proper cleanup** - All useEffect hooks clean up resources
- **No memory leaks** - Intervals and subscriptions properly disposed
- **Optimized re-renders** - Uses useMemo and useCallback where appropriate

## Development Notes

### Browser Connection Limits
- HTTP/1.1 limits browsers to 6 concurrent connections per domain
- MJPEG streams hold connections open indefinitely
- Snapshot mode recommended for viewing multiple cameras
- Proper cleanup crucial when unmounting stream components

### ZoneMinder API Variations
- Portal URL: Main web interface (e.g., `https://zm.example.com`)
- API URL: Can be `/api` or `/zm/api` depending on setup
- CGI URL: Stream endpoint, often `/cgi-bin/nph-zms`
- App tries multiple patterns to detect correct URLs

### Mobile Platform Considerations

#### CORS Handling
- Web browsers enforce Same-Origin Policy and CORS restrictions
- Native mobile apps bypass CORS by using native HTTP stack
- The app automatically detects platform and routes requests appropriately:
  - **Web Dev**: Uses proxy server on localhost:3001
  - **Web Production**: Direct requests (assumes CORS enabled on ZM server)
  - **Android/iOS**: Native HTTP via Capacitor (no CORS issues)

#### Network Security (Android)
- Android 9+ blocks cleartext (HTTP) traffic by default
- App includes `network_security_config.xml` to allow HTTP
- Necessary for ZoneMinder servers without HTTPS
- Production apps should encourage HTTPS where possible

#### Platform Detection
```typescript
import { Capacitor } from '@capacitor/core';
const isNative = Capacitor.isNativePlatform(); // true on Android/iOS
```

### Notification Setup (Production)

#### Desktop
Desktop uses WebSocket connection to ZoneMinder event notification server.

**Requirements:**
- Install `zmeventnotification` on your ZoneMinder server
- See: https://github.com/ZoneMinder/zmeventnotification

**In the app:**
1. Go to Notifications page
2. Enable notifications
3. Enter your ZM server hostname and port (default: 9000)
4. Enable SSL if using WSS
5. Click "Connect"

#### Mobile (Android/iOS)
Mobile uses Firebase Cloud Messaging (FCM) for background notifications.

**Setup:**
1. Create Firebase project at https://console.firebase.google.com
2. Add Android/iOS app to Firebase project
3. Download `google-services.json` (Android) or `GoogleService-Info.plist` (iOS)
4. Place in `android/app/` or `ios/App/`
5. Configure ZoneMinder event server with FCM credentials
6. App will auto-register for push on first launch

**Configure ZoneMinder event server:**
Edit `/etc/zm/zmeventnotification.ini`:
```ini
[fcm]
enable = yes
api_key = <your-firebase-server-key>
```

See [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications) for platform-specific details.

---

## Recent Code Quality Improvements

This codebase underwent a comprehensive refactoring in January 2025:
- **308 lines of code removed** through better organization
- **Monitors.tsx reduced by 56%** (545 → 237 lines)
- **Events.tsx reduced by 32%** (402 → 272 lines)
- **3 reusable components** extracted
- **3 custom hooks** created for common patterns
- **0 TypeScript errors** - fully type-safe
- **Improved security** with password encryption

---

**Last Updated**: 2025-01-27
