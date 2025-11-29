import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getEvent, getEventVideoUrl, getEventImageUrl, getEventZmsUrl } from '../api/events';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { SecureImage } from '../components/ui/secure-image';
import { VideoPlayer } from '../components/ui/video-player';
import { ArrowLeft, Calendar, Clock, HardDrive, AlertTriangle, Download, Archive, Video, ListVideo, Image, Info } from 'lucide-react';
import { format } from 'date-fns';
import { downloadEventVideo, downloadEventImage } from '../lib/download';
import { toast } from 'sonner';
import { ZM_CONSTANTS } from '../lib/constants';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [useZmsFallback, setUseZmsFallback] = useState(false);
  const [showFallbackBadge, setShowFallbackBadge] = useState(false);

  useEffect(() => {
    if (useZmsFallback) {
      setShowFallbackBadge(true);
      const timer = setTimeout(() => {
        setShowFallbackBadge(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [useZmsFallback]);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(id!),
    enabled: !!id,
  });

  const currentProfile = useProfileStore((state) => state.currentProfile());
  const accessToken = useAuthStore((state) => state.accessToken);

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

  console.log('[EventDetail] Event:', event.Event.Id);
  console.log('[EventDetail] DefaultVideo:', event.Event.DefaultVideo);
  console.log('[EventDetail] Videoed:', event.Event.Videoed);
  console.log('[EventDetail] SaveJPEGs:', event.Event.SaveJPEGs);
  console.log('[EventDetail] hasVideo:', hasVideo, 'hasJPEGs:', hasJPEGs);

  const videoUrl = currentProfile && hasVideo
    ? getEventVideoUrl(currentProfile.portalUrl, event.Event.Id, accessToken || undefined)
    : '';

  const zmsUrl = currentProfile && hasVideo
    ? getEventZmsUrl(currentProfile.portalUrl, event.Event.Id, accessToken || undefined)
    : '';

  const imageUrl = currentProfile && hasJPEGs
    ? getEventImageUrl(currentProfile.portalUrl, event.Event.Id, 'snapshot', {
        token: accessToken || undefined,
        width: ZM_CONSTANTS.eventMontageImageWidth,
        height: ZM_CONSTANTS.eventMontageImageHeight,
      })
    : '';

  const posterUrl = currentProfile
    ? getEventImageUrl(currentProfile.portalUrl, event.Event.Id, 'snapshot', {
        token: accessToken || undefined,
      })
    : undefined;

  const startTime = new Date(event.Event.StartDateTime.replace(' ', 'T'));

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 sm:p-3 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t('common.go_back')} className="h-8 w-8">
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
          <Button variant="outline" size="sm" className="gap-2 h-8 sm:h-9" onClick={() => navigate(`/monitors/${event.Event.MonitorId}`)} title={t('event_detail.view_camera')}>
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">{t('event_detail.view_camera')}</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-8 sm:h-9" onClick={() => navigate(`/events?monitorId=${event.Event.MonitorId}`)} title={t('event_detail.all_events')}>
            <ListVideo className="h-4 w-4" />
            <span className="hidden sm:inline">{t('event_detail.all_events')}</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-8 sm:h-9" title={t('event_detail.archive')}>
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">{t('event_detail.archive')}</span>
          </Button>
          {(hasVideo || hasJPEGs) && (
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
                  )
                    .then(() => toast.success(t('event_detail.video_download_started')))
                    .catch(() => toast.error(t('event_detail.video_download_failed')));
                } else if (hasJPEGs && imageUrl) {
                  downloadEventImage(imageUrl, event.Event.Id, event.Event.Name)
                    .then(() => toast.success(t('event_detail.image_downloaded')))
                    .catch(() => toast.error(t('event_detail.image_download_failed')));
                }
              }}
              title={hasVideo ? t('event_detail.download_video') : t('event_detail.download_image')}
            >
              {hasVideo ? (
                <>
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('event_detail.download_video')}</span>
                </>
              ) : (
                <>
                  <Image className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('event_detail.download_image')}</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-2 sm:p-3 md:p-4 flex flex-col items-center bg-muted/10 overflow-y-auto">
        <div className="w-full max-w-5xl space-y-3 sm:space-y-4 md:space-y-6">
          {/* Video Player or Image Display */}
          <Card className="overflow-hidden shadow-2xl border-0 ring-1 ring-border/20 bg-black">
            <div className="aspect-video relative">
              {hasVideo ? (
                useZmsFallback ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
                    <img
                      src={zmsUrl}
                      alt={event.Event.Name}
                      className="w-full h-full object-contain"
                    />
                    {showFallbackBadge && (
                      <div className="absolute top-4 left-4 transition-opacity duration-500">
                        <Badge variant="secondary" className="gap-2 bg-blue-500/80 text-white hover:bg-blue-500">
                          <Info className="h-3 w-3" />
                          {t('event_detail.streaming_via_zms')}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <VideoPlayer
                    src={videoUrl}
                    className="w-full h-full"
                    poster={posterUrl}
                    autoPlay
                    onError={() => {
                      console.log('Video playback failed, falling back to ZMS stream');
                      toast.error(t('event_detail.video_playback_failed'));
                      setUseZmsFallback(true);
                    }}
                  />
                )
              ) : hasJPEGs ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
                  <SecureImage
                    src={imageUrl}
                    alt={event.Event.Name}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%231a1a1a" width="800" height="600"/%3E%3Ctext fill="%23444" x="50%" y="50%" text-anchor="middle" font-family="sans-serif"%3ENo Image Available%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="absolute top-4 left-4">
                    <Badge variant="secondary" className="gap-2">
                      <Image className="h-3 w-3" />
                      {t('event_detail.jpeg_event')}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('event_detail.no_media')}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

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
                  <span className="text-sm font-medium">{event.Event.Width}x{event.Event.Height}</span>
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
