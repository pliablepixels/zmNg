/**
 * Events Filter Popover Component
 *
 * Extracted from Events.tsx to reduce component complexity.
 * Provides filtering UI for events by monitors, favorites, tags, and date range.
 */

import { Star, Tag, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MonitorData, Tag as TagType } from '../../api/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PopoverContent } from '../ui/popover';
import { Switch } from '../ui/switch';
import { QuickDateRangeButtons } from '../ui/quick-date-range-buttons';
import { MonitorFilterPopoverContent } from '../filters/MonitorFilterPopover';
import { TagChip } from './TagChip';
import { cn } from '../../lib/utils';

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
  // Tags filter props
  tagsSupported?: boolean;
  availableTags?: TagType[];
  selectedTagIds?: string[];
  onTagSelectionChange?: (ids: string[]) => void;
  isLoadingTags?: boolean;
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
  tagsSupported = false,
  availableTags = [],
  selectedTagIds = [],
  onTagSelectionChange,
  isLoadingTags = false,
}: EventsFilterPopoverProps) {
  const { t } = useTranslation();

  // Get selected tags for display
  const selectedTags = availableTags.filter((tag) =>
    selectedTagIds.includes(tag.Id)
  );

  const handleTagToggle = (tagId: string) => {
    if (!onTagSelectionChange) return;
    const newSelection = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    onTagSelectionChange(newSelection);
  };

  const handleRemoveTag = (tagId: string) => {
    if (!onTagSelectionChange) return;
    onTagSelectionChange(selectedTagIds.filter((id) => id !== tagId));
  };

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

        {/* Tags filter - only show if tags are supported */}
        {tagsSupported && (
          <div className="p-3 rounded-md border bg-card space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">{t('events.filter.tags')}</Label>
            </div>

            {/* Loading state */}
            {isLoadingTags && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('events.tags.loading')}</span>
              </div>
            )}

            {/* No tags available */}
            {!isLoadingTags && availableTags.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('events.filter.noTags')}
              </p>
            )}

            {/* Selected tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5" data-testid="events-selected-tags">
                {selectedTags.map((tag) => (
                  <TagChip
                    key={tag.Id}
                    tag={tag}
                    removable
                    onRemove={handleRemoveTag}
                    size="md"
                  />
                ))}
              </div>
            )}

            {/* Available tags dropdown */}
            {!isLoadingTags && availableTags.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                {availableTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.Id);
                  return (
                    <button
                      key={tag.Id}
                      type="button"
                      onClick={() => handleTagToggle(tag.Id)}
                      className={cn(
                        'w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center justify-between',
                        isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      )}
                      data-testid={`tag-option-${tag.Id}`}
                    >
                      <span className="truncate">{tag.Name}</span>
                      {isSelected && (
                        <X className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
