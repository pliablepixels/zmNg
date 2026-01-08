/**
 * Event Detail Page
 *
 * Displays detailed information about a specific event.
 * Includes video playback (or image fallback), metadata, and download options.
 */

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getEvent, getEventVideoUrl, getEventImageUrl } from '../api/events';
import { getMonitor } from '../api/monitors';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { VideoPlayer } from '../components/ui/video-player';
import { ZmsEventPlayer } from '../components/events/ZmsEventPlayer';
import { ArrowLeft, Calendar, Clock, HardDrive, AlertTriangle, Download, Archive, Video, Star } from 'lucide-react';
import { format } from 'date-fns';
import { downloadEventVideo } from '../lib/download';
import { parseMonitorRotation } from '../lib/monitor-rotation';
import { toast } from 'sonner';
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { log, LogLevel } from '../lib/logger';
import { generateEventMarkers, type VideoMarker } from '../lib/video-markers';
import { useEventFavoritesStore } from '../stores/eventFavorites';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Check if user came from another page (navigation state tracking)
  const referrer = location.state?.from as string | undefined;
  const [useZmsFallback, setUseZmsFallback] = useState(false);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(id!),
    enabled: !!id,
  });
  const { data: monitorData } = useQuery({
    queryKey: ['monitor', event?.Event.MonitorId],
    queryFn: () => getMonitor(event!.Event.MonitorId),
    enabled: !!event?.Event.MonitorId,
  });

  const currentProfile = useProfileStore((state) => state.currentProfile());
  const accessToken = useAuthStore((state) => state.accessToken);
  const { isFavorited, toggleFavorite } = useEventFavoritesStore();

  const isFav = currentProfile && event ? isFavorited(currentProfile.id, event.Event.Id) : false;

  const handleFavoriteToggle = useCallback(() => {
    if (currentProfile && event) {
      toggleFavorite(currentProfile.id, event.Event.Id);
      toast.success(
        isFav ? t('events.removed_from_favorites') : t('events.added_to_favorites')
      );
    }
  }, [currentProfile, event, toggleFavorite, isFav, t]);

  // Generate video markers for alarm frames
  // NOTE: This hook must be called before any conditional returns
  const videoMarkers = useMemo(() => {
    if (!event) return [];
    const markers = generateEventMarkers(event.Event);

    // Add internationalized text to markers
    return markers.map(marker => ({
      ...marker,
      text: marker.type === 'alarm'
        ? t('event_detail.alarm_frame_marker', { frameId: marker.frameId })
        : t('event_detail.max_score_marker', { frameId: marker.frameId })
    }));
  }, [event, t]);

  // Handle marker clicks
  // NOTE: This hook must be called before any conditional returns
  const handleMarkerClick = useCallback((marker: VideoMarker) => {
    log.eventDetail('Video marker clicked', LogLevel.INFO, {
      frameId: marker.frameId,
      type: marker.type
    });
    toast.info(t('event_detail.marker_jumped', { text: marker.text }));
  }, [t]);

  const orientedResolution = useMemo(() => {
    const width = Number(event?.Event.Width ?? monitorData?.Monitor.Width);
    const height = Number(event?.Event.Height ?? monitorData?.Monitor.Height);

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return `${event?.Event.Width ?? ''}${event?.Event.Width ? 'x' : ''}${event?.Event.Height ?? ''}`;
    }

    const rotation = parseMonitorRotation(event?.Event.Orientation ?? monitorData?.Monitor.Orientation);
    if (rotation.kind === 'degrees') {
      const normalized = ((rotation.degrees % 360) + 360) % 360;
      if (normalized === 90 || normalized === 270) {
        return `${height}x${width}`;
      }
    }

    return `${width}x${height}`;
  }, [
    event?.Event.Height,
    event?.Event.Orientation,
    event?.Event.Width,
    monitorData?.Monitor.Height,
    monitorData?.Monitor.Orientation,
    monitorData?.Monitor.Width,
  ]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="aspect-video w-full max-w-4xl bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-8">
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {t('event_detail.load_error')}
        </div>
        <Button onClick={() => navigate(-1)} className="mt-4">
          {t('common.go_back')}
        </Button>
      </div>
    );
  }

  // Check if event has video - use DefaultVideo field or Videoed field
  const hasVideo = !!(event.Event.DefaultVideo || event.Event.Videoed === '1');
  const hasJPEGs = event.Event.SaveJPEGs !== null && event.Event.SaveJPEGs !== '0';

  log.eventDetail('Event details', LogLevel.DEBUG, {
    eventId: event.Event.Id,
    defaultVideo: event.Event.DefaultVideo,
    videoed: event.Event.Videoed,
    saveJPEGs: event.Event.SaveJPEGs,
    hasVideo,
    hasJPEGs
  });

  const videoUrl = currentProfile && hasVideo
    ? getEventVideoUrl(currentProfile.portalUrl, event.Event.Id, accessToken || undefined, currentProfile.apiUrl)
    : '';

  const posterUrl = currentProfile
    ? getEventImageUrl(currentProfile.portalUrl, event.Event.Id, 'snapshot', {
      token: accessToken || undefined,
      apiUrl: currentProfile.apiUrl,
    })
    : undefined;

  const startTime = new Date(event.Event.StartDateTime.replace(' ', 'T'));

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 sm:p-3 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => referrer ? navigate(referrer) : navigate(-1)}
            aria-label={t('common.go_back')}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm sm:text-base font-semibold truncate max-w-[200px] sm:max-w-none">{event.Event.Name}</h1>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] h-4">
                {event.Event.Cause}
              </Badge>
              <span className="hidden sm:inline">{t('event_detail.camera')} {event.Event.MonitorId}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Button
            variant={isFav ? "default" : "outline"}
            size="sm"
            className="gap-2 h-8 sm:h-9"
            onClick={handleFavoriteToggle}
            title={isFav ? t('events.unfavorite') : t('events.favorite')}
            data-testid="event-detail-favorite-button"
          >
            <Star className={isFav ? "h-4 w-4 fill-current" : "h-4 w-4"} />
            <span className="hidden sm:inline">{isFav ? t('events.favorited') : t('events.favorite')}</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-8 sm:h-9" onClick={() => navigate(`/monitors/${event.Event.MonitorId}`)} title={t('event_detail.view_camera')}>
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">{t('event_detail.view_camera')}</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-8 sm:h-9" onClick={() => navigate(`/events?monitorId=${event.Event.MonitorId}`)} title={t('event_detail.all_events')}>
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">{t('event_detail.all_events')}</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-8 sm:h-9" title={t('event_detail.archive')}>
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">{t('event_detail.archive')}</span>
          </Button>
          {hasVideo && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8 sm:h-9"
              onClick={() => {
                if (hasVideo && currentProfile) {
                  downloadEventVideo(
                    currentProfile.portalUrl,
                    event.Event.Id,
                    event.Event.Name,
                    accessToken || undefined
                  );
                  // Background task drawer will show download progress
                }
              }}
              title={t('event_detail.download_video')}
              data-testid="download-video-button"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('event_detail.download_video')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-2 sm:p-3 md:p-4 flex flex-col items-center bg-muted/10 overflow-y-auto">
        <div className="w-full max-w-5xl space-y-3 sm:space-y-4 md:space-y-6">
          {/* Video Player or ZMS Playback */}
          {hasVideo ? (
            useZmsFallback ? (
              // ZMS playback with controls
              currentProfile && (
                <ZmsEventPlayer
                  portalUrl={currentProfile.portalUrl}
                  eventId={event.Event.Id}
                  token={accessToken || undefined}
                  apiUrl={currentProfile.apiUrl}
                  totalFrames={parseInt(event.Event.Frames)}
                  alarmFrames={parseInt(event.Event.AlarmFrames)}
                  alarmFrameId={event.Event.AlarmFrameId}
                  maxScoreFrameId={event.Event.MaxScoreFrameId}
                  eventLength={parseFloat(event.Event.Length)}
                  className="space-y-4"
                />
              )
            ) : (
              // MP4 video playback
              <Card className="overflow-hidden shadow-2xl border-0 ring-1 ring-border/20 bg-black">
                <div className="aspect-video relative">
                  <VideoPlayer
                    src={videoUrl}
                    type="video/mp4"
                    className="w-full h-full"
                    poster={posterUrl}
                    autoplay
                    markers={videoMarkers}
                    onMarkerClick={handleMarkerClick}
                    onError={() => {
                      log.eventDetail('Video playback failed, falling back to ZMS stream', LogLevel.INFO);
                      toast.error(t('event_detail.video_playback_failed'));
                      setUseZmsFallback(true);
                    }}
                  />
                </div>
              </Card>
            )
          ) : hasJPEGs ? (
            // ZMS playback for JPEG-only events
            currentProfile && (
              <ZmsEventPlayer
                portalUrl={currentProfile.portalUrl}
                eventId={event.Event.Id}
                token={accessToken || undefined}
                apiUrl={currentProfile.apiUrl}
                totalFrames={parseInt(event.Event.Frames)}
                alarmFrames={parseInt(event.Event.AlarmFrames)}
                alarmFrameId={event.Event.AlarmFrameId}
                maxScoreFrameId={event.Event.MaxScoreFrameId}
                eventLength={parseFloat(event.Event.Length)}
                className="space-y-4"
              />
            )
          ) : (
            // No media available
            <Card className="overflow-hidden shadow-2xl border-0 ring-1 ring-border/20 bg-black">
              <div className="aspect-video relative">
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('event_detail.no_media')}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t('event_detail.timing')}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">{t('event_detail.date')}</div>
                    <div className="text-sm text-muted-foreground">{format(startTime, 'MMMM d, yyyy')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">{t('event_detail.time')}</div>
                    <div className="text-sm text-muted-foreground">{format(startTime, 'HH:mm:ss')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 flex items-center justify-center font-bold text-primary text-xs border rounded border-primary">
                    {event.Event.Length}s
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t('event_detail.duration')}</div>
                    <div className="text-sm text-muted-foreground">{event.Event.Length} {t('event_detail.seconds')}</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t('event_detail.details')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{t('event_detail.event_id')}</span>
                  <span className="text-sm font-medium">{event.Event.Id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{t('event_detail.frames')}</span>
                  <span className="text-sm font-medium">{event.Event.Frames} ({event.Event.AlarmFrames} {t('event_detail.alarm')})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{t('event_detail.score')}</span>
                  <span className="text-sm font-medium">{event.Event.AvgScore} / {event.Event.MaxScore}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{t('event_detail.resolution')}</span>
                  <span className="text-sm font-medium">{orientedResolution}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t('event_detail.storage')}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <HardDrive className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">{t('event_detail.disk_usage')}</div>
                    <div className="text-sm text-muted-foreground">{event.Event.DiskSpace || 'Unknown'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Archive className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">{t('event_detail.storage_id')}</div>
                    <div className="text-sm text-muted-foreground">{event.Event.StorageId || 'Default'}</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
