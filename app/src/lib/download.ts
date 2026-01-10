/**
 * Download Utilities
 * 
 * Provides cross-platform file download capabilities for snapshots and videos.
 * Handles platform-specific logic for Web, iOS, Android, and Desktop (Tauri).
 * 
 * Features:
 * - Web: Uses standard browser download (Blob/Anchor)
 * - Mobile: Uses Capacitor Filesystem and Media plugins with chunked streaming to avoid OOM
 * - Desktop (Tauri): Uses native File System and Dialog plugins for robust downloads
 * - Handles CORS issues via native HTTP or proxy
 * - Automatically saves media to device Photo/Video library on mobile
 */

import { writeFile } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { fetch } from '@tauri-apps/plugin-http';
import { log, LogLevel } from './logger';
import { Platform } from './platform';
import { wrapWithImageProxyIfNeeded } from './proxy-utils';

import { getApiClient } from '../api/client';
import { getEventVideoUrl as buildEventVideoUrl } from './url-builder';
import { useBackgroundTasks } from '../stores/backgroundTasks';

/**
 * Progress callback for download operations
 */
export interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Options for download operations
 */
export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
}

/**
 * Platform-specific download handler type
 */
type DownloadHandler = (url: string, filename: string, options?: DownloadOptions) => Promise<void>;

/**
 * Platform-specific data URL snapshot handler type
 */
type DataUrlSnapshotHandler = (dataUrl: string, filename: string) => Promise<void>;

/**
 * Get the appropriate download handler for the current platform
 */
function getDownloadHandler(): DownloadHandler {
  if (Platform.isTauri) return downloadFileTauri;
  if (Platform.isNative) return downloadFileNative;
  return downloadFileWeb;
}

/**
 * Get the appropriate data URL snapshot handler for the current platform
 */
function getDataUrlSnapshotHandler(): DataUrlSnapshotHandler {
  if (Platform.isTauri) return downloadDataUrlTauri;
  if (Platform.isNative) return downloadDataUrlNative;
  return downloadFromDataUrlWeb;
}

/**
 * Download a file from a URL.
 *
 * For web: triggers browser download via a temporary anchor element.
 * For mobile: streams to Documents directory in chunks and then attempts to save to Photo/Video library.
 * For desktop: prompts user for save location and streams to disk.
 *
 * @param url - The URL to download from
 * @param filename - The target filename
 * @param options - Optional download options (progress callback, abort signal)
 */
export async function downloadFile(url: string, filename: string, options?: DownloadOptions): Promise<void> {
  try {
    const handler = getDownloadHandler();
    await handler(url, filename, options);
  } catch (error) {
    log.download('[Download] Failed to download file', LogLevel.ERROR, { url, error });
    throw error;
  }
}

/**
 * Tauri Implementation
 */
async function downloadFileTauri(url: string, filename: string, options?: DownloadOptions): Promise<void> {
  log.download('[Download] Initiating native desktop download', LogLevel.INFO, { url, filename });

  // 1. Prompt user for save location
  const savePath = await save({
    defaultPath: filename,
    filters: [
      {
        name: 'Media',
        extensions: ['mp4', 'jpg', 'png', 'avi', 'mov']
      }
    ]
  });

  if (!savePath) {
    log.download('[Download] User cancelled save dialog', LogLevel.INFO);
    return;
  }

  // 2. Fetch the file using native fetch (Tauri v2 fetch is native)
  log.download('[Download] Fetching file', LogLevel.INFO, { url });

  // Use imported fetch from @tauri-apps/plugin-http which uses rust backend
  const response = await fetch(url, {
    method: 'GET',
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;

  // 3. Stream to file
  if (response.body) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        loaded += value.length;

        if (options?.onProgress && total > 0) {
          const percentage = Math.round((loaded * 100) / total);
          options.onProgress({
            loaded,
            total,
            percentage,
          });
        }
      }
    }

    // Combine chunks
    const combined = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // 4. Write to disk
    await writeFile(savePath, combined);
    log.download('[Download] File saved successfully', LogLevel.INFO, { path: savePath });
  } else {
    // Fallback if no body
    const arrayBuffer = await response.arrayBuffer();
    await writeFile(savePath, new Uint8Array(arrayBuffer));
    log.download('[Download] File saved successfully (no stream)', LogLevel.INFO, { path: savePath });
  }
}

/**
 * Mobile Implementation (Native)
 * Downloads file using native HTTP with streaming to avoid OOM
 */
async function downloadFileNative(url: string, filename: string, _options?: DownloadOptions): Promise<void> {
  log.download('[Download] Initiating native mobile download', LogLevel.INFO, { url, filename });

  // Dynamic imports for Capacitor plugins
  const { Media } = await import('@capacitor-community/media');
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { CapacitorHttp } = await import('@capacitor/core');

  try {
    // Use CapacitorHttp directly to get base64 data without blob conversion
    // This avoids loading the entire file as a Blob in memory (OOM prevention)
    log.download('[Download] Fetching file via native HTTP', LogLevel.INFO, { url });

    const response = await CapacitorHttp.request({
      method: 'GET',
      url,
      responseType: 'blob', // CapacitorHttp returns base64 string for blob type
    });

    if (response.status !== 200) {
      throw new Error(`Failed to download: HTTP ${response.status}`);
    }

    // CapacitorHttp returns base64 string when responseType is 'blob'
    // We use it directly without converting to Blob (avoids OOM)
    const base64Data = response.data as string;

    // Write directly to Documents directory
    const writeResult = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Documents,
    });

    log.download('[Download] File saved to Documents', LogLevel.INFO, {
      path: writeResult.uri,
      filename
    });

    // Save to Photo/Video Library using the file:// URI
    try {
      if (filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
        await Media.savePhoto({ path: writeResult.uri });
        log.download('[Download] Saved to Photo Library', LogLevel.INFO, { filename });
      } else if (filename.match(/\.(mp4|mov|avi)$/i)) {
        await Media.saveVideo({ path: writeResult.uri });
        log.download('[Download] Saved to Video Library', LogLevel.INFO, { filename });
      }
    } catch (mediaError) {
      log.download('[Download] Failed to save to media library, but file is in Documents', LogLevel.WARN, { filename, error: mediaError });
    }
  } catch (error) {
    throw error;
  }
}


/**
 * Web Implementation
 */
async function downloadFileWeb(url: string, filename: string, options?: DownloadOptions): Promise<void> {
  // Web: Use axios/fetch with auth headers to avoid CORS issues
  try {
    const apiClient = getApiClient();

    // Use the image proxy for cross-origin URLs in dev mode
    const proxiedUrl = wrapWithImageProxyIfNeeded(url);
    if (proxiedUrl !== url) {
      log.download('Using proxy for CORS', LogLevel.INFO, { url: proxiedUrl });
    }

    // Use axios to fetch with proper auth headers
    log.download('Downloading file via API client', LogLevel.INFO, { url: proxiedUrl, filename });
    const response = await apiClient.get(proxiedUrl, {
      responseType: 'blob',
      signal: options?.signal,
      onDownloadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage,
          });
        }
      },
    });

    const blob = response.data as Blob;
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Fix for race condition on some browsers/webviews:
    // Delay cleanup to ensure download starts
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 100);

    log.download('File downloaded via browser', LogLevel.INFO, { filename });
  } catch (fetchError) {
    // If axios fails, fall back to direct download link
    // This will open in a new tab and rely on browser's download handling
    log.download('API client download failed, falling back to direct link', LogLevel.WARN, { url, error: fetchError });

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);

    log.download('Initiated direct download', LogLevel.INFO, { filename });
  }
}

/**
 * Download a snapshot from a data URL or image URL.
 */
export async function downloadSnapshot(imageUrl: string, monitorName: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${monitorName}_${timestamp}.jpg`;

  // If it's a data URL, use platform-specific data URL handler
  if (imageUrl.startsWith('data:')) {
    const handler = getDataUrlSnapshotHandler();
    await handler(imageUrl, filename);
    return;
  }

  // Otherwise fetch and download
  await downloadFile(imageUrl, filename);
}

/**
 * Capture current frame from an img element and download.
 */
export async function downloadSnapshotFromElement(
  imgElement: HTMLImageElement,
  monitorName: string
): Promise<void> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${monitorName}_${timestamp}.jpg`;
    const imageUrl = imgElement.src;

    if (imageUrl.startsWith('data:')) {
      await downloadSnapshot(imageUrl, monitorName);
    } else {
      await downloadFile(imageUrl, filename);
    }
  } catch (error) {
    log.download('[Download] Failed to capture snapshot', LogLevel.ERROR, error);
    throw error;
  }
}

/**
 * Desktop (Tauri) data URL download implementation
 */
async function downloadDataUrlTauri(dataUrl: string, filename: string): Promise<void> {
  const savePath = await save({
    defaultPath: filename,
    filters: [{ name: 'Image', extensions: ['jpg', 'png'] }]
  });

  if (savePath) {
    const base64 = dataUrl.split(',')[1];
    // Decode base64 to Uint8Array
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    await writeFile(savePath, bytes);
    log.download('[Download] Snapshot saved via native dialog', LogLevel.INFO, { path: savePath });
  }
}

/**
 * Mobile (Native) data URL download implementation
 */
async function downloadDataUrlNative(dataUrl: string, filename: string): Promise<void> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Media } = await import('@capacitor-community/media');

  const base64 = dataUrl.split(',')[1];
  const result = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Documents,
  });
  log.download('[Download] Snapshot saved from data URL', LogLevel.INFO, {
    path: result.uri,
    filename
  });

  // Save to Photo Library
  try {
    await Media.savePhoto({
      path: result.uri
    });
    log.download('[Download] Snapshot saved to Photo Library', LogLevel.INFO, { filename });
  } catch (mediaError) {
    log.download('[Download] Failed to save snapshot to Photo Library', LogLevel.ERROR, mediaError);
  }
}

/**
 * Web data URL download implementation
 */
function downloadFromDataUrlWeb(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => document.body.removeChild(link), 100);
}

/**
 * Get event video download URL from ZoneMinder.
 * ZoneMinder provides videos in different formats based on event storage.
 */
export function getEventVideoDownloadUrl(
  portalUrl: string,
  eventId: string,
  token?: string
): string {
  return buildEventVideoUrl(portalUrl, eventId, { token });
}

/**
 * Download event video with background task tracking.
 */
export function downloadEventVideo(
  portalUrl: string,
  eventId: string,
  eventName: string,
  token?: string
): string {
  const videoUrl = getEventVideoDownloadUrl(portalUrl, eventId, token);

  // Sanitize event name for filename
  const sanitizedName = eventName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

  // Try to download with appropriate extension
  // ZoneMinder may return mp4, avi, or mjpeg depending on storage format
  const filename = `Event_${eventId}_${sanitizedName}_${timestamp}.mp4`;

  // Create abort controller for cancellation support
  const abortController = new AbortController();

  // Get background task store (cannot use hook outside component)
  const taskStore = useBackgroundTasks.getState();

  // Create background task
  const taskId = taskStore.addTask({
    type: 'download',
    metadata: {
      title: filename,
      description: `Event ${eventId}`,
    },
    cancelFn: () => {
      abortController.abort();
      log.download('Download cancelled by user', LogLevel.INFO, { eventId, filename });
    },
  });

  // Start download asynchronously
  (async () => {
    try {
      await downloadFile(videoUrl, filename, {
        signal: abortController.signal,
        onProgress: (progress) => {
          taskStore.updateProgress(taskId, progress.percentage, progress.loaded);

          // Update file size metadata on first progress update
          if (progress.total && !taskStore.tasks.find(t => t.id === taskId)?.metadata.fileSize) {
            const task = taskStore.tasks.find(t => t.id === taskId);
            if (task) {
              task.metadata.fileSize = progress.total;
            }
          }
        },
      });

      // Mark as completed
      taskStore.completeTask(taskId);
      log.download('Video download completed', LogLevel.INFO, { eventId, filename });
    } catch (error) {
      // Check if it was an abort
      if (error instanceof Error && error.name === 'AbortError') {
        // Already marked as cancelled by cancelFn
        return;
      }

      // Mark as failed
      taskStore.failTask(taskId, error instanceof Error ? error : new Error('Download failed'));
      log.download('Failed to download video', LogLevel.ERROR, { eventId, error });
    }
  })();

  return taskId;
}


