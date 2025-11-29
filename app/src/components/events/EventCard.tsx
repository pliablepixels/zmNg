import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Video, Calendar, Clock } from 'lucide-react';
import type { EventCardProps } from '../../api/types';

function EventCardComponent({ event, monitorName, thumbnailUrl }: EventCardProps) {
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
      <div className="flex gap-2 sm:gap-3 p-2 sm:p-3">
        {/* Thumbnail */}
        <div className="relative w-24 h-18 sm:w-32 sm:h-24 md:w-40 md:h-30 flex-shrink-0 rounded overflow-hidden bg-black">
          <img
            src={thumbnailUrl}
            alt={event.Name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={handleImageError}
          />
          <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 bg-black/80 text-white text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded font-medium">
            {event.Length}s
          </div>
        </div>

        {/* Event Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-sm sm:text-base truncate" title={event.Name}>
                {event.Name}
              </h3>
              <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs">
                {event.Cause}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Video className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="truncate max-w-[100px] sm:max-w-[150px]" title={monitorName}>
                  {monitorName}
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{format(startTime, 'MMM d, yyyy')}</span>
                <span className="sm:hidden">{format(startTime, 'MMM d')}</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                {format(startTime, 'HH:mm:ss')}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-[10px] sm:text-xs text-muted-foreground">
            <span>{event.Frames} frames</span>
            <span className="hidden sm:inline">•</span>
            <span>{event.AlarmFrames} alarm</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden md:inline">
              Score: {event.AvgScore}/{event.MaxScore}
            </span>
            {event.Archived === '1' && (
              <>
                <span className="hidden sm:inline">•</span>
                <Badge variant="secondary" className="text-[10px] sm:text-xs h-4 sm:h-5">
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

// Memoize to prevent unnecessary re-renders in virtualized event lists
export const EventCard = memo(EventCardComponent);
