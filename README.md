# zmNg - Modern ZoneMinder Client

[View Comparison with zmNinja](COMPARISON.md)

A modern web application for ZoneMinder NVR systems, providing a clean, intuitive interface for viewing live camera feeds, reviewing events, and managing multiple server profiles. It is a ground-up rewrite of the original [zmNinja](https://zmninja.zoneminder.com/) application, using modern web technologies and a more intuitive user interface. The code was 99% claude CLI generated. 

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

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation
```bash
npm install
```

### Development
```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Testing
```bash
# Run E2E tests with Playwright
npm run test:e2e

# Run tests with interactive UI
npm run test:e2e:ui
```

## Test Servers

1. **demo.zoneminder.com** - No authentication required
2. **zm.connortechnology.com** - Username: `demo` (Password required)

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
- **Styling**: TailwindCSS 4 + shadcn/ui components
- **State Management**: Zustand with persistence
- **Data Fetching**: TanStack Query (React Query)
- **HTTP Client**: Axios with interceptors
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

---

**Last Updated**: 2025-11-27
