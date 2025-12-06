/**
 * Download Utilities
 * 
 * Provides cross-platform file download capabilities for snapshots and videos.
 * Handles platform-specific logic for Web, iOS, and Android.
 * 
 * Features:
 * - Web: Uses standard browser download (Blob/Anchor)
 * - Mobile: Uses Capacitor Filesystem and Media plugins
 * - Handles CORS issues via native HTTP or proxy
 * - Automatically saves media to device Photo/Video library on mobile
 */

import { CapacitorHttp } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Media } from '@capacitor-community/media';
import { log } from './logger';
import { Platform } from './platform';
import { getApiClient } from '../api/client';

/**
 * Download a file from a URL.
 * 
 * For web: triggers browser download via a temporary anchor element.
 * For mobile: saves to Documents directory and then attempts to save to Photo/Video library.
 * 
 * @param url - The URL to download from
 * @param filename - The target filename
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    if (Platform.isNative) {
      // Mobile: Use native HTTP to bypass CORS and network restrictions
      log.info('[Download] Downloading via native HTTP', { component: 'Download', url });

      const response = await CapacitorHttp.get({
        url: url,
        responseType: 'blob',
      });

      if (response.status !== 200) {
        throw new Error(`Failed to download: HTTP ${response.status}`);
      }

      // CapacitorHttp returns blob data as base64 string
      const base64Data = response.data as string;

      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
      });

      log.info('[Download] File saved to mobile storage', {
        component: 'Download',
        path: result.uri,
        filename
      });

      // Save to Photo Library if it's an image or video
      try {
        if (filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
          await Media.savePhoto({
            path: result.uri
          });
          log.info('[Download] Saved to Photo Library', { component: 'Download', filename });
        } else if (filename.match(/\.(mp4|mov|avi)$/i)) {
          await Media.saveVideo({
            path: result.uri
          });
          log.info('[Download] Saved to Video Library', { component: 'Download', filename });
        }
      } catch (mediaError) {
        log.error('[Download] Failed to save to media library', { component: 'Download', filename }, mediaError);
        // Don't throw here, as the file is at least saved to Documents
      }
    } else {
      // Web: Use axios with auth headers to avoid CORS issues
      try {
        const apiClient = getApiClient();

        if (Platform.shouldUseProxy && (url.startsWith('http://') || url.startsWith('https://'))) {
          // Use the image proxy for cross-origin URLs in dev mode
          url = `http://localhost:3001/image-proxy?url=${encodeURIComponent(url)}`;
          log.info('Using proxy for CORS', { component: 'Download', url });
        }

        // Use axios to fetch with proper auth headers
        log.info('Downloading file via API client', { component: 'Download', url, filename });
        const response = await apiClient.get(url, {
          responseType: 'blob',
        });

        const blob = response.data as Blob;
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up blob URL
        window.URL.revokeObjectURL(blobUrl);

        log.info('File downloaded via browser', { component: 'Download', filename });
      } catch (fetchError) {
        // If axios fails, fall back to direct download link
        // This will open in a new tab and rely on browser's download handling
        log.warn('API client download failed, falling back to direct link', {
          component: 'Download',
          url
        }, fetchError);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        log.info('Initiated direct download', { component: 'Download', filename });
      }
    }
  } catch (error) {
    log.error('[Download] Failed to download file', { component: 'Download', url }, error);
    throw error;
  }
}

/**
 * Download a snapshot from a data URL or image URL.
 * 
 * @param imageUrl - URL or data URL of the image
 * @param monitorName - Name of the monitor for filename generation
 */
export async function downloadSnapshot(imageUrl: string, monitorName: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${monitorName}_${timestamp}.jpg`;

  // If it's a data URL
  if (imageUrl.startsWith('data:')) {
    if (Platform.isNative) {
      // Mobile: Save data URL directly
      const base64 = imageUrl.split(',')[1];
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents,
      });
      log.info('[Download] Snapshot saved from data URL', {
        component: 'Download',
        path: result.uri,
        filename
      });

      // Save to Photo Library
      try {
        await Media.savePhoto({
          path: result.uri
        });
        log.info('[Download] Snapshot saved to Photo Library', { component: 'Download', filename });
      } catch (mediaError) {
        log.error('[Download] Failed to save snapshot to Photo Library', { component: 'Download' }, mediaError);
      }
    } else {
      // Web: Traditional download
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return;
  }

  // Otherwise fetch and download
  await downloadFile(imageUrl, filename);
}

/**
 * Capture current frame from an img element and download.
 * 
 * @param imgElement - The image element to capture
 * @param monitorName - Name of the monitor for filename generation
 */
export async function downloadSnapshotFromElement(
  imgElement: HTMLImageElement,
  monitorName: string
): Promise<void> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${monitorName}_${timestamp}.jpg`;
    const imageUrl = imgElement.src;

    // If it's a data URL
    if (imageUrl.startsWith('data:')) {
      if (Platform.isNative) {
        // Mobile: Save data URL to filesystem
        const base64 = imageUrl.split(',')[1];
        const result = await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Documents,
        });

        log.info('[Download] Snapshot saved from data URL', {
          component: 'Download',
          path: result.uri,
          filename
        });

        // Save to Photo Library
        try {
          await Media.savePhoto({
            path: result.uri
          });
          log.info('[Download] Snapshot saved to Photo Library', { component: 'Download', filename });
        } catch (mediaError) {
          log.error('[Download] Failed to save snapshot to Photo Library', { component: 'Download' }, mediaError);
        }
      } else {
        // Web: Traditional download
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      return;
    }

    // For cross-origin images, use downloadFile which handles both platforms
    await downloadFile(imageUrl, filename);
  } catch (error) {
    log.error('[Download] Failed to capture snapshot', { component: 'Download' }, error);
    throw error;
  }
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
  // Ensure portalUrl has a protocol
  let baseUrl = portalUrl;
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }

  // ZoneMinder video export endpoint
  // This tries to get the video file directly (mp4, avi, or mjpeg)
  const params = new URLSearchParams({
    view: 'video',
    eid: eventId,
    ...(token && { token }),
  });

  return `${baseUrl}/index.php?${params.toString()}`;
}

/**
 * Download event video.
 * 
 * @param portalUrl - ZoneMinder portal URL
 * @param eventId - Event ID
 * @param eventName - Event name for filename
 * @param token - Optional auth token
 */
export async function downloadEventVideo(
  portalUrl: string,
  eventId: string,
  eventName: string,
  token?: string
): Promise<void> {
  const videoUrl = getEventVideoDownloadUrl(portalUrl, eventId, token);

  // Sanitize event name for filename
  const sanitizedName = eventName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

  // Try to download with appropriate extension
  // ZoneMinder may return mp4, avi, or mjpeg depending on storage format
  const filename = `Event_${eventId}_${sanitizedName}_${timestamp}.mp4`;

  try {
    await downloadFile(videoUrl, filename);
  } catch (error) {
    log.error('Failed to download video', { component: 'Download', eventId }, error);
    throw error;
  }
}


