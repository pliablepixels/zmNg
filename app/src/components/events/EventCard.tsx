import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Video, Calendar, Clock } from 'lucide-react';
import type { EventCardProps } from '../../api/types';

export function EventCard({ event, monitorName, thumbnailUrl }: EventCardProps) {
  const navigate = useNavigate();
  const startTime = new Date(event.StartDateTime.replace(' ', 'T'));

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    img.src =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="120"%3E%3Crect fill="%231a1a1a" width="160" height="120"/%3E%3Ctext fill="%23666" x="50%" y="50%" text-anchor="middle" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E';
  };

  return (
    <Card
      className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 hover:ring-2 hover:ring-primary/50"
      onClick={() => navigate(`/events/${event.Id}`)}
    >
      <div className="flex gap-4 p-3">
        {/* Thumbnail */}
        <div className="relative w-40 h-30 flex-shrink-0 rounded overflow-hidden bg-black">
          <img
            src={thumbnailUrl}
            alt={event.Name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={handleImageError}
          />
          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
            {event.Length}s
          </div>
        </div>

        {/* Event Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-base truncate" title={event.Name}>
                {event.Name}
              </h3>
              <Badge variant="outline" className="shrink-0 text-xs">
                {event.Cause}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Video className="h-4 w-4" />
                <span className="truncate max-w-[150px]" title={monitorName}>
                  {monitorName}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {format(startTime, 'MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {format(startTime, 'HH:mm:ss')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{event.Frames} frames</span>
            <span>•</span>
            <span>{event.AlarmFrames} alarm frames</span>
            <span>•</span>
            <span>
              Score: {event.AvgScore}/{event.MaxScore}
            </span>
            {event.Archived === '1' && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="text-xs h-5">
                  Archived
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
