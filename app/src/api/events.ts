import { getApiClient } from './client';
import type { EventsResponse, EventData } from './types';
import { EventsResponseSchema } from './types';

export interface EventFilters {
  monitorId?: string;
  startDateTime?: string;
  endDateTime?: string;
  archived?: boolean;
  minAlarmFrames?: number;
  limit?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

/**
 * Get events with optional filtering
 * Automatically fetches multiple pages if needed to reach the desired limit
 */
export async function getEvents(filters: EventFilters = {}): Promise<EventsResponse> {
  const client = getApiClient();

  // Build filter path for ZM API
  let filterPath = '';
  if (filters.monitorId) {
    // Support multiple monitor IDs separated by commas
    const monitorIds = filters.monitorId.split(',');
    monitorIds.forEach(id => {
      filterPath += `/MonitorId:${id.trim()}`;
    });
  }
  if (filters.startDateTime) {
    // ZM API expects space instead of T
    const formattedStart = filters.startDateTime.replace('T', ' ');
    filterPath += `/StartDateTime >=:${formattedStart}`;
  }
  if (filters.endDateTime) {
    const formattedEnd = filters.endDateTime.replace('T', ' ');
    filterPath += `/EndDateTime <=:${formattedEnd}`;
  }
  if (filters.minAlarmFrames) {
    filterPath += `/AlarmFrames >=:${filters.minAlarmFrames}`;
  }

  // Use /events/index.json for both filtered and unfiltered requests
  const url = filterPath ? `/events/index${filterPath}.json` : '/events/index.json';

  const desiredLimit = filters.limit || 300;
  const allEvents: any[] = [];
  let currentPage = 1;
  let hasMore = true;

  // Keep fetching pages until we have enough events or no more pages
  while (hasMore && allEvents.length < desiredLimit) {
    const params: Record<string, string | number> = {};
    params.page = currentPage;
    params.limit = 100; // ZM's max per page, we'll fetch multiple pages
    if (filters.sort) params.sort = filters.sort;
    if (filters.direction) params.direction = filters.direction;

    console.log(`[API] Fetching events page ${currentPage}, have ${allEvents.length}/${desiredLimit} events so far`);

    const response = await client.get<EventsResponse>(url, { params });
    const validated = EventsResponseSchema.parse(response.data);

    // Add events from this page
    allEvents.push(...validated.events);

    // Check if there are more pages
    if (validated.pagination?.nextPage) {
      currentPage++;
    } else {
      hasMore = false;
    }
  }

  // Return only the requested number of events
  const finalEvents = allEvents.slice(0, desiredLimit);

  console.log(`[API] Fetched total of ${allEvents.length} events, returning ${finalEvents.length} (requested: ${desiredLimit})`);

  // Return with pagination info set to indicate if there are more events available
  return {
    events: finalEvents,
    pagination: {
      page: 1,
      pageCount: Math.ceil(allEvents.length / desiredLimit),
      nextPage: allEvents.length > desiredLimit ? 2 : undefined,
    },
  };
}

/**
 * Get a single event by ID
 */
export async function getEvent(eventId: string): Promise<EventData> {
  const client = getApiClient();
  const response = await client.get<{ event: EventData }>(`/events/${eventId}.json`);
  return response.data.event;
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const client = getApiClient();
  await client.delete(`/events/${eventId}.json`);
}

/**
 * Archive or unarchive an event
 */
export async function setEventArchived(eventId: string, archived: boolean): Promise<EventData> {
  const client = getApiClient();
  const response = await client.put(`/events/${eventId}.json`, {
    'Event[Archived]': archived ? '1' : '0',
  });
  return response.data.event;
}

/**
 * Get event count for console (recent events per monitor)
 * Returns event counts per monitor within the specified interval
 */
export async function getConsoleEvents(interval: string = '1 hour'): Promise<Record<string, number>> {
  const client = getApiClient();
  const response = await client.get(`/events/consoleEvents/${encodeURIComponent(interval)}.json`);

  // The response is an object where keys are monitor IDs and values are event counts
  // Example: { "1": 5, "2": 3, "3": 0 }
  return response.data.results || {};
}

/**
 * Construct event image URL using ZoneMinder's index.php endpoint
 * Format: /index.php?view=image&eid=<eventId>&fid=<frame>&width=<width>&height=<height>&token=<token>
 * In dev mode, uses proxy to avoid CORS issues
 */
export function getEventImageUrl(
  portalUrl: string,
  eventId: string,
  frame: number | 'snapshot' | 'objdetect',
  options: {
    token?: string;
    width?: number;
    height?: number;
  } = {}
): string {
  // Build query parameters for ZoneMinder's index.php image viewer
  const params = new URLSearchParams();
  params.append('view', 'image');
  params.append('eid', eventId);
  params.append('fid', frame.toString());

  if (options.width) params.append('width', options.width.toString());
  if (options.height) params.append('height', options.height.toString());
  if (options.token) params.append('token', options.token);

  // Construct the full URL: portalUrl/index.php?view=image&eid=...
  const imagePath = `/index.php?${params.toString()}`;
  const fullUrl = `${portalUrl}${imagePath}`;

  // In dev mode, use proxy server to avoid CORS issues
  // In production (Tauri), use direct URL
  const isDev = import.meta.env.DEV;
  if (isDev) {
    const proxyParams = new URLSearchParams();
    proxyParams.append('url', fullUrl);
    return `http://localhost:3001/image-proxy?${proxyParams.toString()}`;
  } else {
    return fullUrl;
  }
}

/**
 * Construct event video URL (for MP4 playback)
 */
export function getEventVideoUrl(
  portalUrl: string,
  eventId: string,
  token?: string
): string {
  const params = new URLSearchParams({
    view: 'view_video',
    eid: eventId,
    ...(token && { token }),
  });

  return `${portalUrl}/index.php?${params.toString()}`;
}
