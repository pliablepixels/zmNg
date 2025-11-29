import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getEvent, getEventVideoUrl, getEventImageUrl } from '../api/events';
import { useProfileStore } from '../stores/profile';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Calendar, Clock, HardDrive, AlertTriangle, Download, Archive, Video, ListVideo, Image } from 'lucide-react';
import { format } from 'date-fns';
import { downloadEventVideo, downloadEventImage } from '../lib/download';
import { toast } from 'sonner';
import { ZM_CONSTANTS } from '../lib/constants';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
          Failed to load event
        </div>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Go Back
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

  const imageUrl = currentProfile && hasJPEGs
    ? getEventImageUrl(currentProfile.portalUrl, event.Event.Id, 'snapshot', {
        token: accessToken || undefined,
        width: ZM_CONSTANTS.eventMontageImageWidth,
        height: ZM_CONSTANTS.eventMontageImageHeight,
      })
    : '';

  const startTime = new Date(event.Event.StartDateTime.replace(' ', 'T'));

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 sm:p-3 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm sm:text-base font-semibold truncate max-w-[200px] sm:max-w-none">{event.Event.Name}</h1>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] h-4">
                {event.Event.Cause}
              </Badge>
              <span className="hidden sm:inline">Camera {event.Event.MonitorId}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2 h-8 sm:h-9" onClick={() => navigate(`/monitors/${event.Event.MonitorId}`)} title="View Camera">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">View Camera</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-8 sm:h-9" onClick={() => navigate(`/events?monitorId=${event.Event.MonitorId}`)} title="All Events">
            <ListVideo className="h-4 w-4" />
            <span className="hidden sm:inline">All Events</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-8 sm:h-9" title="Archive">
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Archive</span>
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
                    .then(() => toast.success('Video download started'))
                    .catch(() => toast.error('Failed to download video'));
                } else if (hasJPEGs && imageUrl) {
                  downloadEventImage(imageUrl, event.Event.Id, event.Event.Name)
                    .then(() => toast.success('Image downloaded'))
                    .catch(() => toast.error('Failed to download image'));
                }
              }}
              title={hasVideo ? 'Download Video' : 'Download Image'}
            >
              {hasVideo ? (
                <>
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download Video</span>
                </>
              ) : (
                <>
                  <Image className="h-4 w-4" />
                  <span className="hidden sm:inline">Download Image</span>
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
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                  poster={currentProfile ? `${currentProfile.apiUrl}/events/${event.Event.Id}.json?token=${accessToken}` : undefined}
                >
                  Your browser does not support the video tag.
                </video>
              ) : hasJPEGs ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
                  <img
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
                      JPEG Event (No Video)
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No video or images available for this event</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Timing</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Date</div>
                    <div className="text-sm text-muted-foreground">{format(startTime, 'MMMM d, yyyy')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Time</div>
                    <div className="text-sm text-muted-foreground">{format(startTime, 'HH:mm:ss')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 flex items-center justify-center font-bold text-primary text-xs border rounded border-primary">
                    {event.Event.Length}s
                  </div>
                  <div>
                    <div className="text-sm font-medium">Duration</div>
                    <div className="text-sm text-muted-foreground">{event.Event.Length} seconds</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Event ID</span>
                  <span className="text-sm font-medium">{event.Event.Id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Frames</span>
                  <span className="text-sm font-medium">{event.Event.Frames} ({event.Event.AlarmFrames} alarm)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Score</span>
                  <span className="text-sm font-medium">{event.Event.AvgScore} / {event.Event.MaxScore}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Resolution</span>
                  <span className="text-sm font-medium">{event.Event.Width}x{event.Event.Height}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Storage</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <HardDrive className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Disk Usage</div>
                    <div className="text-sm text-muted-foreground">{event.Event.DiskSpace || 'Unknown'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Archive className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Storage ID</div>
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
