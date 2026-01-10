/**
 * Events Filter Popover Component
 *
 * Extracted from Events.tsx to reduce component complexity.
 * Provides filtering UI for events by monitors, favorites, and date range.
 */

import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MonitorData } from '../../api/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PopoverContent } from '../ui/popover';
import { Switch } from '../ui/switch';
import { QuickDateRangeButtons } from '../ui/quick-date-range-buttons';
import { MonitorFilterPopoverContent } from '../filters/MonitorFilterPopover';

interface EventsFilterPopoverProps {
  monitors: MonitorData[];
  selectedMonitorIds: string[];
  onMonitorSelectionChange: (ids: string[]) => void;
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (value: boolean) => void;
  startDateInput: string;
  onStartDateChange: (value: string) => void;
  endDateInput: string;
  onEndDateChange: (value: string) => void;
  onQuickRangeSelect: (range: { start: Date; end: Date }) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

export function EventsFilterPopover({
  monitors,
  selectedMonitorIds,
  onMonitorSelectionChange,
  favoritesOnly,
  onFavoritesOnlyChange,
  startDateInput,
  onStartDateChange,
  endDateInput,
  onEndDateChange,
  onQuickRangeSelect,
  onApplyFilters,
  onClearFilters,
}: EventsFilterPopoverProps) {
  const { t } = useTranslation();

  return (
    <PopoverContent
      className="w-[calc(100vw-2rem)] sm:w-80 max-w-sm max-h-[80vh] overflow-y-auto no-scrollbar"
      data-testid="events-filter-panel"
    >
      <MonitorFilterPopoverContent
        monitors={monitors}
        selectedMonitorIds={selectedMonitorIds}
        onSelectionChange={onMonitorSelectionChange}
        idPrefix="events"
      />
      <div className="grid gap-4 mt-4">
        {/* Favorites filter */}
        <div className="flex items-center justify-between p-3 rounded-md border bg-card">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-yellow-500 stroke-yellow-500" />
            <Label htmlFor="favorites-only" className="cursor-pointer">
              {t('events.favorites_only')}
            </Label>
          </div>
          <Switch
            id="favorites-only"
            checked={favoritesOnly}
            onCheckedChange={onFavoritesOnlyChange}
            data-testid="events-favorites-toggle"
          />
        </div>
      </div>
      <div className="grid gap-4 mt-4">
        <div className="grid gap-2">
          <div className="grid gap-2">
            <Label htmlFor="start-date">
              {t('events.date_range')} ({t('events.start')})
            </Label>
            <Input
              id="start-date"
              type="datetime-local"
              value={startDateInput}
              onChange={(e) => onStartDateChange(e.target.value)}
              step="1"
              data-testid="events-start-date"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="end-date">
              {t('events.date_range')} ({t('events.end')})
            </Label>
            <Input
              id="end-date"
              type="datetime-local"
              value={endDateInput}
              onChange={(e) => onEndDateChange(e.target.value)}
              step="1"
              data-testid="events-end-date"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">{t('events.quick_ranges')}</Label>
            <QuickDateRangeButtons onRangeSelect={onQuickRangeSelect} />
          </div>
          <div className="flex gap-2">
            <Button onClick={onApplyFilters} size="sm" className="flex-1" data-testid="events-apply-filters">
              {t('common.filter')}
            </Button>
            <Button
              onClick={onClearFilters}
              size="sm"
              variant="outline"
              className="flex-1"
              data-testid="events-clear-filters"
            >
              {t('common.clear')}
            </Button>
          </div>
        </div>
      </div>
    </PopoverContent>
  );
}
