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

## API Client

### HTTP Client

**Location**: `src/lib/http.ts`

Wrapper around `fetch` with error handling, authentication, and logging:

```tsx
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const profileId = useProfileStore.getState().currentProfile?.id;
  const tokens = profileId ? await getAuthTokens(profileId) : null;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (tokens) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  log.http('API request', LogLevel.DEBUG, { url, method: options.method || 'GET' });

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    log.http('API request failed', LogLevel.ERROR, { url, error });
    throw error;
  }
}
```

### API Functions

**Location**: `src/api/`

```
src/api/
├── auth.ts          # Authentication (login, logout, refresh)
├── monitors.ts      # Monitor endpoints
├── events.ts        # Event endpoints
├── streaming.ts     # Stream URL generation
├── discovery.ts     # ZeroConf server discovery
└── types.ts         # TypeScript types for API responses
```

**Example: Fetching monitors**

```tsx
// src/api/monitors.ts
import { apiRequest } from '../lib/http';

export interface Monitor {
  Id: string;
  Name: string;
  Width: string;
  Height: string;
  Function: 'None' | 'Monitor' | 'Modect' | 'Record' | 'Mocord' | 'Nodect';
  Controllable: '0' | '1';
  // ... more fields
}

export interface MonitorsResponse {
  monitors: Array<{
    Monitor: Monitor;
    Monitor_Status: MonitorStatus;
  }>;
}

export async function fetchMonitors(profileId: string): Promise<MonitorsResponse> {
  const profile = getProfile(profileId);

  const data = await apiRequest<MonitorsResponse>(
    `${profile.portalUrl}/api/monitors.json`,
    { method: 'GET' }
  );

  return data;
}

export async function updateMonitor(
  monitorId: string,
  updates: Partial<Monitor>
): Promise<Monitor> {
  const profile = useProfileStore.getState().currentProfile;

  const data = await apiRequest<{ monitor: Monitor }>(
    `${profile.portalUrl}/api/monitors/${monitorId}.json`,
    {
      method: 'PUT',
      body: JSON.stringify({ Monitor: updates }),
    }
  );

  return data.monitor;
}
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
export async function fetchMonitors(profileId: string): Promise<MonitorsResponse> {
  const profile = getProfile(profileId);  // From Zustand store

  const data = await apiRequest<MonitorsResponse>(
    `${profile.portalUrl}/api/monitors.json`
  );

  return data;
}
```

### 3. HTTP client adds authentication

```tsx
// src/lib/http.ts
export async function apiRequest(url: string) {
  const tokens = await getAuthTokens(profileId);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
    },
  });

  return response.json();
}
```

### 4. Response cached by React Query

Query key: `['monitors', profileId]`

Next time this component renders (or another component requests same data), React Query returns cached result instantly.

### 5. Components render with data

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

### 6. MonitorCard requests stream URL

```tsx
function MonitorCard({ monitor }) {
  const { streamUrl } = useMonitorStream({ monitorId: monitor.Id });

  return <img src={streamUrl} />;
}
```

### 7. useMonitorStream generates authenticated URL

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

### 8. Stream loads in <img>

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
2. **Connection keys**: Unique per stream, must be generated before rendering
3. **Stream lifecycle**: Generate connKey → Build URL → Render → Send CMD_QUIT on unmount
4. **React Query**: Handles caching, loading states, refetching
5. **Query keys**: Define cache buckets and invalidation targets
6. **Mutations**: For create/update/delete operations
7. **Infinite queries**: For paginated data like events
8. **HTTP client**: Centralized error handling and authentication
9. **Data flow**: Component → React Query → API function → HTTP client → ZoneMinder
10. **Error handling**: Distinguish API errors, network errors, auth errors
11. **Optimistic updates**: Update UI before server confirms
12. **Stream cleanup**: Always send CMD_QUIT to prevent resource leaks

## Next Steps

Continue to [Chapter 8: Common Pitfalls](./08-common-pitfalls.md) for a collection of common mistakes and how to avoid them.
