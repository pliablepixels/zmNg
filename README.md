# zmNg - Modern ZoneMinder Client

[View Comparison with zmNinja](COMPARISON.md)

A modern web and mobile application for ZoneMinder NVR systems, providing a clean, intuitive interface for viewing live camera feeds, reviewing events, and managing multiple server profiles. It is a ground-up rewrite of the original [zmNinja](https://zmninja.zoneminder.com/) application, using modern web technologies and a more intuitive user interface. The code was 99% claude CLI generated.

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
- Secure credential storage with automatic token refresh
- Smart URL detection (portal, API, and CGI endpoints)

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

### Screenshots

![Montage View](images/1.png)
![Events View](images/2.png)
![Event Detail](images/3.png)
![Timeline](images/4.png)
![Monitor Detail](images/5.png)
![Settings](images/6.png)
![Profile Switcher](images/7.png)

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
```bash
npm run test:e2e        # Run E2E tests
npm run test:e2e:ui     # Run with UI
```

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
- **Testing**: Playwright for E2E
- **Layout**: react-grid-layout for drag-and-drop montage
- **Timeline**: vis-timeline for event visualization

## Architecture

### State Management
- **Profile Store** (`stores/profile.ts`) - Manages server profiles and credentials
- **Auth Store** (`stores/auth.ts`) - Handles authentication and token lifecycle
- **Settings Store** (`stores/settings.ts`) - Profile-specific user preferences
- **Monitor Store** (`stores/monitors.ts`) - Connection key management for streams

### API Layer
- **API Client** (`api/client.ts`) - Axios instance with automatic token injection
  - Uses proxy server in web development mode
  - Uses Capacitor native HTTP on mobile to bypass CORS
  - Direct requests in web production mode
- **Monitor API** (`api/monitors.ts`) - Camera listing and stream URL generation
- **Event API** (`api/events.ts`) - Event queries, filtering, and image URLs
- **Auth API** (`api/auth.ts`) - Login and token refresh

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
├── components/
│   ├── layout/          # AppLayout with sidebar navigation
│   └── ui/              # shadcn/ui components
├── lib/
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
└── styles/              # Global styles and timeline CSS
```

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

---

**Last Updated**: 2025-11-27
