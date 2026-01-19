# API and Data Fetching

This chapter covers how zmNg interacts with ZoneMinder's API and manages server data.

## API Architecture

### ZoneMinder API Overview

ZoneMinder provides a RESTful API for accessing monitors, events, and server data:

**Base URL Pattern:**
```
https://your-server.com/zm/api/<endpoint>
```

**Common Endpoints:**
- `/host/getVersion.json` - Server version
- `/monitors.json` - List all monitors
- `/monitors/<id>.json` - Single monitor details
- `/events.json` - List events
- `/events/<id>.json` - Event details
- `/host/login.json` - Authentication

### Authentication

ZoneMinder uses session-based authentication with tokens:

1. **Login**: POST credentials to `/host/login.json`
2. **Receive**: Access token and refresh token
3. **Use**: Include token in subsequent requests
4. **Refresh**: Use refresh token when access token expires

**Implementation** (`src/api/auth.ts`):

```tsx
export async function login(
  portalUrl: string,
  username: string,
  password: string
): Promise<AuthTokens> {
  const response = await fetch(`${portalUrl}/api/host/login.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: username,
      pass: password,
    }),
  });

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpires: Date.now() + data.access_token_expires * 1000,
    refreshTokenExpires: Date.now() + data.refresh_token_expires * 1000,
  };
}
```

Tokens are stored encrypted in `SecureStorage`:

```tsx
await SecureStorage.set(`auth_tokens_${profileId}`, JSON.stringify(tokens));
```

### Connection Keys (connkey)

For streaming URLs, ZoneMinder uses connection keys instead of tokens:

**What are connkeys?**
- Short-lived authentication keys for media streams
- Generated via `/host/getConnkey.json`
- Appended to stream URLs
- Expire after a period (server-configured)

**Generation** (`src/api/streaming.ts`):

```tsx
export async function generateConnKey(profile: Profile): Promise<string> {
  const tokens = await getAuthTokens(profile.id);

  const response = await fetch(
    `${profile.portalUrl}/api/host/getConnkey.json?token=${tokens.accessToken}`
  );

  const data = await response.json();
  return data.connkey;
}
```

**Usage in stream URLs:**

```tsx
const streamUrl = `${portalUrl}/cgi-bin/nph-zms?mode=jpeg&monitor=${monitorId}&connkey=${connkey}`;
```

**Caching:**

Connection keys are cached to avoid repeated API calls:

```tsx
const connkeyCache = new Map<string, { key: string; expires: number }>();

export async function getConnKey(profileId: string): Promise<string> {
  const cached = connkeyCache.get(profileId);

  if (cached && cached.expires > Date.now()) {
    return cached.key;
  }

  const key = await generateConnKey(profile);

  connkeyCache.set(profileId, {
    key,
    expires: Date.now() + 5 * 60 * 1000,  // 5 minutes
  });

  return key;
}

### Streaming Mechanics

Video streaming in zmNg is more complex than simple API calls due to browser limitations and ZoneMinder's architecture.

#### 1. Cache Busting (`_t`)
Browsers aggressively cache image requests based on URL. When using `mode=single` (Snapshot mode) or when a stream connection breaks and needs re-establishing, the browser might show a stale image if the URL hasn't changed.

To force a refresh, we append a **cache buster parameter** (`_t=<timestamp>`) to the stream URL:
```
/cgi-bin/nph-zms?mode=jpeg&monitor=1&token=xyz&_t=1704358000000
```
This is handled centrally in `src/lib/url-builder.ts`.

#### 2. Multi-Port Streaming
Browsers limit the number of concurrent connections to the same domain (typically 6). If you have a dashboard with 10 monitors, the 7th monitor will fail to load until another closes.

To bypass this, we use **domain sharding via ports**. If `minStreamingPort` is configured (e.g., 30000) in the profile:
- Monitor 1 loads from `port 30001`
- Monitor 2 loads from `port 30002`
- ...and so on.

This tricks the browser into treating each stream as a separate origin, bypassing the connection limit.

#### 3. Streaming vs. Snapshot
The app supports two view modes:
- **Streaming (`mode=jpeg`)**: A long-lived HTTP connection where the server pushes new frames (MJPEG). Low latency but higher bandwidth and connection usage.
- **Snapshot (`mode=single`)**: The app fetches a single JPEG image, waits `snapshotRefreshInterval` seconds, and fetches again. Lower resource usage but lower frame rate.

Snapshot mode uses `Image()` preloading in `useMonitorStream` to download the next frame in the background before swapping the `src` of the visible image, ensuring flicker-free playback.

```

## React Query Integration

We use React Query (`@tanstack/react-query`) for server state management.

### Why React Query?

- **Automatic caching**: Responses are cached by query key
- **Background refetching**: Keeps data fresh automatically
- **Loading/error states**: Built-in state management
- **Deduplication**: Multiple components requesting same data = one request
- **Pagination**: Built-in infinite scroll support

### Query Client Setup

**Location**: `src/main.tsx`

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,  // Data fresh for 30 seconds
      cacheTime: 5 * 60 * 1000,  // Keep in cache for 5 minutes
      retry: 2,  // Retry failed requests twice
      refetchOnWindowFocus: true,  // Refetch when window focused
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

### Basic Queries

**Fetching monitors:**

```tsx
function MonitorList() {
  const currentProfile = useProfileStore((state) => state.currentProfile);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['monitors', currentProfile?.id],
    queryFn: () => fetchMonitors(currentProfile!.id),
    enabled: !!currentProfile,  // Only run if profile exists
    staleTime: 30000,  // Fresh for 30s
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div>
      {data.monitors.map(m => <MonitorCard key={m.Id} monitor={m} />)}
    </div>
  );
}
```

**Query key structure:**

```tsx
['monitors']                    // All monitors
['monitors', profileId]         // Monitors for specific profile
['monitor', monitorId]          // Single monitor
['events', profileId]           // Events for profile
['events', profileId, filters]  // Filtered events
```

Query keys are used for:
- Caching (same key = same cache entry)
- Invalidation (clear specific cached data)
- Deduplication (prevent duplicate requests)

### Dependent Queries

Sometimes one query depends on another's result:

```tsx
function MonitorStream({ monitorId }: { monitorId: string }) {
  const currentProfile = useProfileStore((state) => state.currentProfile);

  // First query: Get monitor data
  const { data: monitor } = useQuery({
    queryKey: ['monitor', monitorId],
    queryFn: () => fetchMonitor(monitorId),
  });

  // Second query: Only run if monitor exists
  const { data: streamUrl } = useQuery({
    queryKey: ['stream', monitorId, currentProfile?.id],
    queryFn: () => generateStreamUrl(currentProfile!.id, monitorId),
    enabled: !!monitor && !!currentProfile,  // Wait for monitor to load
  });

  return streamUrl ? <VideoPlayer src={streamUrl} /> : <Spinner />;
}
```

### Polling / Auto-Refetch

Keep data fresh with automatic refetching:

```tsx
const { data } = useQuery({
  queryKey: ['monitors', profileId],
  queryFn: () => fetchMonitors(profileId),
  refetchInterval: 30000,  // Refetch every 30 seconds
  refetchIntervalInBackground: false,  // Stop when app in background
});
```

### Complete Timer and Polling Reference

zmNg uses various timers and scheduled tasks across the application to keep data fresh and maintain connections. Understanding these timers is crucial for debugging performance issues and optimizing resource usage.

#### Global / App-Level Timers

| Timer | Location | Interval | Action |
|-------|----------|----------|--------|
| Token Refresh | `hooks/useTokenRefresh.ts` | **60 seconds** | Checks if access token is expiring soon and refreshes it 5 minutes before expiry |
| WebSocket Keepalive | `services/notifications.ts` | **60 seconds** | Sends ping to keep WebSocket connection alive for push notifications |

**Token Refresh Implementation:**

```tsx
// hooks/useTokenRefresh.ts
export function useTokenRefresh(): void {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessTokenExpires = useAuthStore((state) => state.accessTokenExpires);
  const refreshAccessToken = useAuthStore((state) => state.refreshAccessToken);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAndRefresh = async () => {
      if (accessTokenExpires) {
        const timeUntilExpiry = accessTokenExpires - Date.now();
        // Refresh 5 minutes before expiry
        if (timeUntilExpiry < ZM_INTEGRATION.accessTokenLeewayMs && timeUntilExpiry > 0) {
          await refreshAccessToken();
        }
      }
    };

    checkAndRefresh();
    const interval = setInterval(checkAndRefresh, ZM_INTEGRATION.tokenCheckInterval);
    return () => clearInterval(interval);
  }, [isAuthenticated, accessTokenExpires, refreshAccessToken]);
}
```

#### Screen-Specific Timers

**Monitors Page** (`pages/Monitors.tsx`):

| Timer | Interval | Action |
|-------|----------|--------|
| Event Counts | **60 seconds** | Refreshes 24-hour event counts per monitor |

```tsx
const { data: eventCounts } = useQuery({
  queryKey: ['consoleEvents', '24 hour'],
  queryFn: () => getConsoleEvents('24 hour'),
  refetchInterval: 60000,
});
```

**Monitor Detail Page** (`pages/MonitorDetail.tsx`):

| Timer | Interval | Action |
|-------|----------|--------|
| Alarm Status | **5 seconds** | Polls alarm status for the current monitor |
| Monitor Cycling | **Configurable** | Auto-cycles to next monitor (if enabled in settings) |

```tsx
const { data: alarmStatus } = useQuery({
  queryKey: ['monitor-alarm-status', monitor?.Monitor.Id],
  queryFn: () => getAlarmStatus(monitor!.Monitor.Id),
  refetchInterval: 5000,
  refetchIntervalInBackground: true,
});

// Monitor cycling (if enabled)
useEffect(() => {
  const cycleSeconds = settings.monitorDetailCycleSeconds;
  if (!cycleSeconds || cycleSeconds <= 0) return;
  
  const intervalId = window.setInterval(() => {
    // Navigate to next monitor
  }, cycleSeconds * 1000);
  
  return () => window.clearInterval(intervalId);
}, [settings.monitorDetailCycleSeconds]);
```

**Montage Page** (`pages/Montage.tsx` + `components/monitors/MontageMonitor.tsx`):

| Timer | Interval | Action |
|-------|----------|--------|
| Snapshot Refresh | **Configurable** | Refreshes each monitor image (only in snapshot mode, not streaming) |

```tsx
// hooks/useMonitorStream.ts - Used by montage monitors
useEffect(() => {
  if (settings.viewMode !== 'snapshot') return;

  const interval = setInterval(() => {
    setCacheBuster(Date.now());  // Forces image reload
  }, settings.snapshotRefreshInterval * 1000);

  return () => clearInterval(interval);
}, [settings.viewMode, settings.snapshotRefreshInterval]);
```

**Server Page** (`pages/Server.tsx`):

| Timer | Interval | Action |
|-------|----------|--------|
| Daemon Status | **30 seconds** | Checks if ZoneMinder daemon is running |

```tsx
const { data: isDaemonRunning } = useQuery({
  queryKey: ['daemon-check', currentProfile?.id],
  queryFn: getDaemonCheck,
  refetchInterval: 30000,
});
```

#### Dashboard Widget Timers

**Events Widget** (`components/dashboard/widgets/EventsWidget.tsx`):

| Timer | Interval | Action |
|-------|----------|--------|
| Events Refetch | **30 seconds** (default, configurable) | Refreshes recent events list |

```tsx
export function EventsWidget({ refreshInterval = 30000 }: EventsWidgetProps) {
  const { data: events } = useQuery({
    queryKey: ['events', monitorId, limit],
    queryFn: () => getEvents({ /* ... */ }),
    refetchInterval: refreshInterval,
  });
}
```

**Timeline Widget** (`components/dashboard/widgets/TimelineWidget.tsx`):

| Timer | Interval | Action |
|-------|----------|--------|
| Events Refetch | **60 seconds** | Refreshes timeline events data |

**Heatmap Widget** (`components/dashboard/widgets/HeatmapWidget.tsx`):

| Timer | Interval | Action |
|-------|----------|--------|
| Events Refetch | **60 seconds** | Refreshes heatmap event data |

**Monitor Widget** (`components/dashboard/widgets/MonitorWidget.tsx`):

| Timer | Interval | Action |
|-------|----------|--------|
| Snapshot Refresh | **Configurable** | Refreshes monitor image (only in snapshot mode) |

#### Configuration Constants

All default intervals are defined in `lib/zmng-constants.ts`:

```tsx
export const ZM_INTEGRATION = {
  // Polling and status intervals
  eventCheckTime: 30000,           // 30 sec - default event checking
  streamQueryStatusTime: 10000,    // 10 sec - stream status polling
  alarmStatusTime: 10000,          // 10 sec - alarm status polling
  streamReconnectDelay: 5000,      // 5 sec - delay before stream reconnect
  
  // Token management
  tokenCheckInterval: 60 * 1000,   // 60 sec - check token expiry
  accessTokenLeewayMs: 5 * 60 * 1000,  // 5 min - refresh before expiry
  loginInterval: 1800000,          // 30 min - re-login interval
} as const;
```

#### Timer Best Practices

**1. Always Clean Up Timers:**

```tsx
// Good ✅
useEffect(() => {
  const interval = setInterval(() => {
    // Do something
  }, 1000);
  
  return () => clearInterval(interval);  // Cleanup
}, []);

// Bad ❌
useEffect(() => {
  setInterval(() => {
    // Timer keeps running even after unmount!
  }, 1000);
}, []);
```

**2. Use refetchInterval for Polling Queries:**

Prefer React Query's `refetchInterval` over manual `setInterval`:

```tsx
// Good ✅ - React Query handles cleanup automatically
const { data } = useQuery({
  queryKey: ['monitors'],
  queryFn: getMonitors,
  refetchInterval: 30000,
});

// Bad ❌ - Manual polling requires cleanup
useEffect(() => {
  const interval = setInterval(() => {
    fetchMonitors().then(setData);
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

**3. Stop Background Polling:**

Save battery and bandwidth by stopping polls when app is in background:

```tsx
const { data } = useQuery({
  queryKey: ['monitors'],
  queryFn: getMonitors,
  refetchInterval: 30000,
  refetchIntervalInBackground: false,  // Stop when app backgrounded
});
```

**4. Conditional Timers:**

Only start timers when needed:

```tsx
useEffect(() => {
  // Only cycle if enabled and there are multiple monitors
  if (!settings.monitorDetailCycleSeconds || enabledMonitors.length < 2) return;
  
  const interval = setInterval(() => {
    // Cycle to next monitor
  }, settings.monitorDetailCycleSeconds * 1000);
  
  return () => clearInterval(interval);
}, [settings.monitorDetailCycleSeconds, enabledMonitors.length]);
```

#### Performance Considerations

**Timer Impact on Performance:**

| Frequency | Impact | Recommendation |
|-----------|--------|----------------|
| < 1 second | High CPU/battery usage | Only for critical real-time data (alarm status) |
| 1-10 seconds | Moderate usage | Good for live monitoring features |
| 30-60 seconds | Low usage | Ideal for background data refresh |
| > 60 seconds | Minimal usage | Best for infrequent checks |

**Debugging Timers:**

Use browser DevTools to profile timer overhead:

```tsx
// Add logging to track timer execution
const interval = setInterval(() => {
  console.time('timer-execution');
  // Timer logic
  console.timeEnd('timer-execution');
}, 1000);
```

**Memory Leaks:**

Forgotten timers are a common source of memory leaks. Always verify cleanup:

```tsx
// Run in DevTools console to check for orphaned timers
console.log('Active intervals:', window.setInterval.length);
console.log('Active timeouts:', window.setTimeout.length);
```

### Mutations

For creating, updating, or deleting data:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function MonitorEditor({ monitor }: { monitor: Monitor }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Monitor>) =>
      updateMonitor(monitor.Id, updates),

    onSuccess: (updatedMonitor) => {
      // Invalidate related queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['monitor', monitor.Id] });
      queryClient.invalidateQueries({ queryKey: ['monitors'] });

      toast.success('Monitor updated');
    },

    onError: (error) => {
      toast.error(`Failed to update monitor: ${error.message}`);
    },
  });

  const handleSave = (formData: MonitorFormData) => {
    updateMutation.mutate(formData);
  };

  return (
    <Form
      onSubmit={handleSave}
      isLoading={updateMutation.isPending}
      error={updateMutation.error}
    />
  );
}
```

**Optimistic Updates:**

For better UX, update the UI immediately before the server responds:

```tsx
const deleteMutation = useMutation({
  mutationFn: (monitorId: string) => deleteMonitor(monitorId),

  onMutate: async (monitorId) => {
    // Cancel ongoing queries
    await queryClient.cancelQueries({ queryKey: ['monitors'] });

    // Snapshot current data
    const previousMonitors = queryClient.getQueryData(['monitors']);

    // Optimistically update cache
    queryClient.setQueryData(['monitors'], (old: MonitorsResponse) => ({
      monitors: old.monitors.filter(m => m.Id !== monitorId),
    }));

    // Return context for rollback
    return { previousMonitors };
  },

  onError: (err, monitorId, context) => {
    // Rollback on error
    if (context?.previousMonitors) {
      queryClient.setQueryData(['monitors'], context.previousMonitors);
    }
    toast.error('Failed to delete monitor');
  },

  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ['monitors'] });
  },
});
```

### Infinite Queries (Pagination)

For paginated data like event lists:

```tsx
function EventTimeline() {
  const currentProfile = useProfileStore((state) => state.currentProfile);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['events', currentProfile?.id],
    queryFn: ({ pageParam = 0 }) =>
      fetchEvents(currentProfile!.id, { page: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!currentProfile,
  });

  // Flatten pages into single array
  const events = data?.pages.flatMap(page => page.events) ?? [];

  return (
    <div>
      {events.map(event => <EventCard key={event.Id} event={event} />)}

      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </Button>
      )}
    </div>
  );
}
```

## HTTP Client Architecture

### Overview

The application uses a **unified HTTP client** (`src/lib/http.ts`) that provides platform-agnostic HTTP requests across Web, iOS, Android, and Desktop (Tauri). This architecture provides:

- Automatic platform detection (Native/Tauri/Web/Proxy)
- CORS handling via native HTTP or development proxy
- Token injection for authenticated requests
- Response type handling (json, blob, arraybuffer, text, base64)
- Request/response correlation logging
- Progress callbacks for downloads

**IMPORTANT:** Always use the `httpGet`, `httpPost`, `httpPut`, `httpDelete` functions from `lib/http.ts`. Never use raw `fetch()` or third-party HTTP libraries directly.

**Components:**

```
src/lib/
├── http.ts          # Unified HTTP client (USE THIS)
├── platform.ts      # Platform detection utilities
└── logger.ts        # Logging utilities

src/api/
├── auth.ts          # Authentication endpoints
├── monitors.ts      # Monitor endpoints
├── events.ts        # Event endpoints
├── streaming.ts     # Stream URL generation
├── server.ts        # Server info endpoints
└── types.ts         # TypeScript types for API responses
```

### Unified HTTP Client (`src/lib/http.ts`)

The HTTP client automatically selects the appropriate implementation based on platform:

| Platform | Implementation | Notes |
|----------|---------------|-------|
| iOS/Android | Capacitor HTTP plugin | Bypasses CORS, uses native networking |
| Desktop (Tauri) | Tauri fetch plugin | Native performance |
| Web (dev) | fetch + proxy | Routes through localhost:3001 |
| Web (prod) | fetch | Standard browser fetch |

**Basic Usage:**

```tsx
import { httpGet, httpPost, httpPut, httpDelete } from '../lib/http';

// GET request
const response = await httpGet<MonitorsResponse>(
  `${apiUrl}/api/monitors.json`,
  { token: accessToken }
);
const monitors = response.data;

// POST request
const result = await httpPost<AuthResponse>(
  `${apiUrl}/api/host/login.json`,
  { user: username, pass: password }
);

// PUT request with token
await httpPut(
  `${apiUrl}/api/monitors/${id}.json`,
  { Monitor: updates },
  { token: accessToken }
);

// DELETE request
await httpDelete(`${apiUrl}/api/events/${eventId}.json`, { token });
```

**Options Interface:**

```tsx
interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  headers?: Record<string, string>;
  params?: Record<string, string | number>;  // Query parameters
  body?: unknown;                              // Request body (POST/PUT)
  responseType?: 'json' | 'blob' | 'arraybuffer' | 'text' | 'base64';
  token?: string;                              // Auth token (added to params)
  timeoutMs?: number;                          // Request timeout
  signal?: AbortSignal;                        // For cancellation
  validateStatus?: (status: number) => boolean;
  onDownloadProgress?: (progress: HttpProgress) => void;
}
```

### Request/Response Correlation

All HTTP requests are assigned a monotonically increasing correlation ID for debugging.

**How it works:**

1. Request generates correlation ID: `1, 2, 3, ...`
2. Logs request with ID: `[HTTP] Request #1 GET /api/monitors.json`
3. Logs response with same ID: `[HTTP] Response #1 GET /api/monitors.json`
4. Logs errors with same ID: `[HTTP] Failed #1 GET /api/monitors.json`

**Example logs:**

```
[HTTP] Request #1 GET https://server.com/api/monitors.json
  { requestId: 1, platform: 'Web', method: 'GET', url: '...' }

[HTTP] Response #1 GET https://server.com/api/monitors.json
  { requestId: 1, platform: 'Web', status: 200, duration: '145ms' }

[HTTP] Request #2 POST https://server.com/api/host/login.json
  { requestId: 2, platform: 'Native', method: 'POST', url: '...' }

[HTTP] Failed #2 POST https://server.com/api/host/login.json
  { requestId: 2, platform: 'Native', duration: '50ms', error: {...} }
```

**Why correlation IDs matter:**

- Match requests with responses in logs when multiple concurrent requests occur
- Debug authentication failures by tracing request → 401 → token refresh → retry
- Monitor performance by tracking request duration per request
- Identify slow endpoints in production

### Platform-Specific Implementations

**Native (iOS/Android) - Capacitor HTTP:**

```tsx
// Automatically used when Platform.isNative is true
const { CapacitorHttp } = await import('@capacitor/core');
const response = await CapacitorHttp.request({
  method: 'GET',
  url: fullUrl,
  headers,
  data: body,
  responseType: 'json', // or 'blob', 'arraybuffer'
});
```

Benefits:
- Bypasses CORS restrictions
- Uses native networking stack (faster, more reliable)
- Handles SSL/TLS natively

**Tauri (Desktop) - Tauri Fetch Plugin:**

```tsx
// Automatically used when Platform.isTauri is true
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
const response = await tauriFetch(url, {
  method,
  headers,
  body: JSON.stringify(body),
  signal,
});
```

**Web (Browser) - Standard Fetch:**

```tsx
// Automatically used on web platform
const response = await fetch(url, {
  method,
  headers,
  body: JSON.stringify(body),
  signal,
});
```

### Proxy Support (Development)

In development (web only), requests are routed through a local proxy to bypass CORS.

**How it works:**

1. `Platform.shouldUseProxy` returns true in dev mode on web
2. HTTP client rewrites URLs: `https://server.com/api` → `http://localhost:3001/proxy/api`
3. Adds `X-Target-Host: https://server.com` header
4. Proxy server forwards request and returns response

**Example:**

```tsx
// Original URL
const url = 'https://zm.example.com/api/monitors.json';

// With proxy enabled (dev mode on web):
// Request URL: http://localhost:3001/proxy/api/monitors.json
// Header: X-Target-Host: https://zm.example.com
```

**When proxy is used:**

- Platform: Web
- Environment: Development (`import.meta.env.DEV`)
- NOT used on native platforms (they bypass CORS natively)
- NOT used in production builds

### Response Types

The HTTP client supports multiple response types:

| Type | Description | Use Case |
|------|-------------|----------|
| `json` (default) | Parses JSON response | API responses |
| `text` | Returns raw text | HTML, plain text |
| `blob` | Returns Blob object | File downloads (web) |
| `arraybuffer` | Returns ArrayBuffer | Binary data |
| `base64` | Returns base64 string | Mobile downloads |

**Example: Downloading a file**

```tsx
// For web (blob)
const response = await httpGet<Blob>(url, {
  responseType: 'blob',
  onDownloadProgress: (progress) => {
    console.log(`Downloaded ${progress.percentage}%`);
  },
});

// For mobile (base64 to avoid OOM)
const response = await httpGet<string>(url, {
  responseType: 'base64',
});
```

**CRITICAL for Mobile:** Never convert to Blob on mobile - use `responseType: 'base64'` and write directly to filesystem to avoid out-of-memory errors on large files.

### Error Handling

The HTTP client throws `HttpError` for non-2xx responses:

```tsx
interface HttpError extends Error {
  status: number;
  statusText: string;
  data: unknown;
  headers: Record<string, string>;
}
```

**Example:**

```tsx
try {
  const response = await httpGet(url, { token });
  return response.data;
} catch (error) {
  if ((error as HttpError).status === 401) {
    // Token expired - refresh and retry
    await refreshAccessToken();
    return httpGet(url, { token: newToken });
  }
  if ((error as HttpError).status === 404) {
    toast.error('Resource not found');
    return null;
  }
  // Network error or other issue
  toast.error('Request failed');
  throw error;
}
```

### API Functions

API functions are thin wrappers around the HTTP client.

**Example: Fetching monitors**

```tsx
// src/api/monitors.ts
import { httpGet, httpPut } from '../lib/http';
import { useAuthStore } from '../stores/auth';

export async function fetchMonitors(apiUrl: string): Promise<MonitorsResponse> {
  const { accessToken } = useAuthStore.getState();
  const response = await httpGet<MonitorsResponse>(
    `${apiUrl}/api/monitors.json`,
    { token: accessToken }
  );
  return response.data;
}

export async function updateMonitor(
  apiUrl: string,
  monitorId: string,
  updates: Partial<Monitor>
): Promise<Monitor> {
  const { accessToken } = useAuthStore.getState();
  const response = await httpPut<{ monitor: Monitor }>(
    `${apiUrl}/api/monitors/${monitorId}.json`,
    { Monitor: updates },
    { token: accessToken }
  );
  return response.data.monitor;
}
```

**API organization:**

```
src/api/
├── auth.ts          # login(), logout(), refreshAccessToken()
├── monitors.ts      # fetchMonitors(), updateMonitor(), getAlarmStatus()
├── events.ts        # fetchEvents(), fetchEvent(), deleteEvent()
├── states.ts        # fetchStates(), changeState()
├── server.ts        # getVersion(), getDaemonStatus(), fetchMinStreamingPort()
└── streaming.ts     # generateConnKey(), getStreamUrl()
```

## Data Flow Example

Let's trace a complete data flow: viewing monitors

### 1. User navigates to Monitors page

```tsx
// src/pages/Monitors.tsx
export default function Monitors() {
  const currentProfile = useProfileStore((state) => state.currentProfile);

  const { data, isLoading, error } = useQuery({
    queryKey: ['monitors', currentProfile?.id],
    queryFn: () => fetchMonitors(currentProfile!.id),
    enabled: !!currentProfile,
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <MonitorGrid monitors={data.monitors} />
  );
}
```

### 2. React Query calls queryFn

```tsx
// src/api/monitors.ts
import { httpGet } from '../lib/http';
import { useAuthStore } from '../stores/auth';

export async function fetchMonitors(apiUrl: string): Promise<MonitorsResponse> {
  const { accessToken } = useAuthStore.getState();
  const response = await httpGet<MonitorsResponse>(
    `${apiUrl}/api/monitors.json`,
    { token: accessToken }
  );
  return response.data;
}
```

### 3. HTTP client adds authentication and logging

```tsx
// src/lib/http.ts (internal flow)
// 1. Token is added to query params
const finalParams = { ...params };
if (token) {
  finalParams.token = token;
}

// 2. Request ID generated for correlation
const requestId = ++requestIdCounter;
log.http(`[HTTP] Request #${requestId} GET ${fullUrl}`, LogLevel.DEBUG, {
  requestId, platform, method, url: fullUrl,
});
```

### 4. Platform-specific HTTP execution

**On Web:**
- Standard `fetch()` is used
- In dev mode, requests route through proxy to bypass CORS

**On Native (iOS/Android):**
- Capacitor HTTP plugin is used
- Bypasses CORS restrictions
- Uses native networking stack

**On Tauri (Desktop):**
- Tauri fetch plugin is used
- Native performance

### 5. Response logged with correlation ID

```tsx
// After successful response
log.http(`[HTTP] Response #${requestId} GET ${fullUrl}`, LogLevel.DEBUG, {
  requestId, platform, status: response.status, duration: '145ms',
});
```

### 6. Response cached by React Query

Query key: `['monitors', profileId]`

Next time this component renders (or another component requests same data), React Query returns cached result instantly.

### 7. Components render with data

```tsx
function MonitorGrid({ monitors }) {
  return (
    <div>
      {monitors.map(m => (
        <MonitorCard key={m.Monitor.Id} monitor={m.Monitor} />
      ))}
    </div>
  );
}
```

### 8. MonitorCard requests stream URL

```tsx
function MonitorCard({ monitor }) {
  const { streamUrl } = useMonitorStream({ monitorId: monitor.Id });

  return <img src={streamUrl} />;
}
```

### 9. useMonitorStream generates authenticated URL

```tsx
export function useMonitorStream({ monitorId }) {
  const [streamUrl, setStreamUrl] = useState('');

  useEffect(() => {
    const profile = useProfileStore.getState().currentProfile;

    generateConnKey(profile).then(connkey => {
      const url = `${profile.portalUrl}/cgi-bin/nph-zms?mode=jpeg&monitor=${monitorId}&connkey=${connkey}`;
      setStreamUrl(url);
    });
  }, [monitorId]);

  return { streamUrl };
}
```

### 10. Stream loads in <img>

Browser requests JPEG stream with connkey authentication.

## Error Handling

### API Errors

```tsx
class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string
  ) {
    super(message || `API Error: ${status} ${statusText}`);
  }
}
```

**Usage:**

```tsx
try {
  const data = await fetchMonitors(profileId);
} catch (error) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      // Unauthorized - refresh tokens
      await refreshAuthTokens(profileId);
      // Retry request
    } else if (error.status === 404) {
      // Not found
      toast.error('Monitor not found');
    } else {
      // Other error
      toast.error(`Server error: ${error.statusText}`);
    }
  } else {
    // Network error
    toast.error('Network error - check connection');
  }
}
```

### React Query Error Handling

```tsx
const { data, error } = useQuery({
  queryKey: ['monitors'],
  queryFn: fetchMonitors,
  retry: (failureCount, error) => {
    // Don't retry on 404
    if (error instanceof ApiError && error.status === 404) {
      return false;
    }
    // Retry network errors up to 3 times
    return failureCount < 3;
  },
});

if (error) {
  return <ErrorDisplay error={error} onRetry={refetch} />;
}
```

## ZoneMinder Streaming Protocol

ZoneMinder uses a separate streaming daemon (ZMS) for video streams. Understanding the streaming lifecycle is critical to avoid resource leaks.

### Stream Lifecycle

**1. Connection Key Generation**

Each stream requires a unique connection key (connkey):

```tsx
// src/stores/monitors.ts
const connKeyCounter = useRef(0);

export const regenerateConnKey = (monitorId: string) => {
  connKeyCounter.current += 1;
  return connKeyCounter.current;
};
```

**2. Stream URL Construction**

```tsx
// src/api/monitors.ts
export function getStreamUrl(
  cgiUrl: string,
  monitorId: string,
  options: StreamOptions
): string {
  const params = new URLSearchParams({
    view: 'view_video',
    mode: options.mode || 'jpeg',  // 'jpeg' for streaming, 'single' for snapshot
    monitor: monitorId,
    connkey: options.connkey.toString(),
    scale: options.scale?.toString() || '100',
    maxfps: options.maxfps?.toString() || '',
    token: options.token || '',
  });

  return `${cgiUrl}/nph-zms?${params.toString()}`;
}
```

**3. Stream Cleanup with CMD_QUIT**

When a stream is no longer needed, send `CMD_QUIT` to the ZMS daemon:

```tsx
import { getZmsControlUrl } from '../lib/url-builder';
import { ZMS_COMMANDS } from '../lib/zm-constants';
import { httpGet } from '../lib/http';

useEffect(() => {
  return () => {
    // Cleanup on unmount
    if (connKey !== 0 && currentProfile) {
      const controlUrl = getZmsControlUrl(
        currentProfile.portalUrl,
        ZMS_COMMANDS.cmdQuit,
        connKey.toString(),
        { token: accessToken }
      );

      httpGet(controlUrl).catch(() => {
        // Silently ignore errors - connection may already be closed
      });
    }
  };
}, []); // Empty deps - only run on unmount
```

### Critical Pattern: Never Render Without Valid ConnKey

**Problem:** Starting a stream with `connKey=0` creates zombie streams that can't be terminated.

**Solution:** Only build stream URLs when `connKey !== 0`:

```tsx
const [connKey, setConnKey] = useState(0);

// Generate connKey in effect
useEffect(() => {
  const newKey = regenerateConnKey(monitorId);
  setConnKey(newKey);
}, [monitorId]);

// CRITICAL: Check connKey before building URL
const streamUrl = currentProfile && connKey !== 0
  ? getStreamUrl(currentProfile.cgiUrl, monitorId, {
      connkey: connKey,
      mode: 'jpeg',
      // ...
    })
  : '';  // Empty string until connKey is valid

return <img src={streamUrl} />;
```

### Stream Modes

Defined in `src/lib/zm-constants.ts`:

- **`jpeg`**: MJPEG streaming (continuous multipart JPEG frames)
- **`single`**: Single frame snapshot (one JPEG image)
- **`stream`**: Raw stream (rarely used)

### ZMS Commands

The ZMS daemon accepts various control commands via HTTP requests:

```tsx
// src/lib/zm-constants.ts
export const ZMS_COMMANDS = {
  cmdPlay: 1,      // Start/resume playback
  cmdPause: 2,     // Pause playback
  cmdStop: 3,      // Stop playback
  cmdQuit: 17,     // CRITICAL: Close stream connection
  cmdQuery: 18,    // Query stream status
  // ... more commands
} as const;
```

**Most important:** `cmdQuit` (17) - Always send this when unmounting to prevent zombie streams.

### Common Streaming Pitfalls

1. **Zombie Streams**: Rendering before `connKey` is valid creates orphaned streams
2. **Missing Cleanup**: Not sending `CMD_QUIT` leaves streams running on server
3. **CORS Issues**: Use native HTTP client (`httpGet`) for CMD_QUIT, not browser `fetch()`
4. **Effect Dependencies**: Don't include full objects in deps, use primitive IDs only

See [Chapter 8, Pitfall #3](./08-common-pitfalls.md#3-rendering-streams-before-connection-key-is-valid-zombie-streams) for detailed examples.

## Key Takeaways

1. **ZoneMinder API**: RESTful JSON API with session-based auth
2. **HTTP Architecture**: Unified `lib/http.ts` client with automatic platform detection
3. **Always use `httpGet`/`httpPost`/`httpPut`/`httpDelete`**: Never use raw `fetch()` or third-party HTTP libraries
4. **Correlation IDs**: Monotonic sequence (1, 2, 3...) tracks request/response pairs in logs
5. **Platform-specific HTTP**: Capacitor HTTP (native), Tauri fetch (desktop), browser fetch (web)
6. **Logging**: All HTTP requests logged with `log.http()` including duration
7. **Authentication**: Pass token via `{ token }` option - automatically added to query params
8. **React Query**: Handles caching, loading states, refetching
9. **Query keys**: Define cache buckets and invalidation targets
10. **Mutations**: For create/update/delete operations
11. **Infinite queries**: For paginated data like events
12. **Data flow**: Component → React Query → API function → `httpGet`/etc → Platform HTTP → ZoneMinder
13. **Connection keys**: Unique per stream, must be generated before rendering
14. **Stream lifecycle**: Generate connKey → Build URL → Render → Send CMD_QUIT on unmount
15. **Error handling**: Catch `HttpError` and check `.status` for specific handling
16. **Mobile downloads**: Use `responseType: 'base64'` to avoid OOM - never convert to Blob
17. **Stream cleanup**: Always send CMD_QUIT to prevent resource leaks

## Next Steps

Continue to [Chapter 8: Common Pitfalls](./08-common-pitfalls.md) for a collection of common mistakes and how to avoid them.
