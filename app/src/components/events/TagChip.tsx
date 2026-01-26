/**
 * TagChip Component
 *
 * A small chip component for displaying event tags.
 * Can be used in event cards, lists, and filter UI.
 */

import { memo } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Tag } from '../../api/types';

interface TagChipProps {
  /** Tag to display */
  tag: Tag;
  /** Whether the chip can be removed */
  removable?: boolean;
  /** Callback when remove button is clicked */
  onRemove?: (tagId: string) => void;
  /** Additional class names */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

/**
 * Simple string hash to generate consistent color for each tag name.
 * Returns a hue value between 0-360.
 */
function getTagColorHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/**
 * TagChip component.
 * Displays a tag as a colored chip with optional remove button.
 */
function TagChipComponent({
  tag,
  removable = false,
  onRemove,
  className,
  size = 'sm',
}: TagChipProps) {
  const hue = getTagColorHue(tag.Name);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(tag.Id);
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        className
      )}
      style={{
        backgroundColor: `hsl(${hue}, 70%, 90%)`,
        color: `hsl(${hue}, 70%, 25%)`,
      }}
      data-testid="tag-chip"
    >
      <span className="truncate max-w-[80px]" title={tag.Name}>
        {tag.Name}
      </span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className={cn(
            'rounded-full hover:bg-black/10 transition-colors flex-shrink-0',
            size === 'sm' ? 'p-0.5' : 'p-0.5'
          )}
          aria-label={`Remove ${tag.Name}`}
          data-testid="tag-chip-remove"
        >
          <X className={cn(size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
        </button>
      )}
    </span>
  );
}

export const TagChip = memo(TagChipComponent);

/**
 * TagChipList Component
 *
 * Displays a list of tags with overflow handling.
 */
interface TagChipListProps {
  /** Tags to display */
  tags: Tag[];
  /** Maximum number of visible tags */
  maxVisible?: number;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional class names */
  className?: string;
  /** Text for overflow indicator */
  overflowText?: (count: number) => string;
}

function TagChipListComponent({
  tags,
  maxVisible = 3,
  size = 'sm',
  className,
  overflowText = (count) => `+${count}`,
}: TagChipListProps) {
  if (tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const overflowCount = tags.length - maxVisible;

  return (
    <div
      className={cn('flex flex-wrap items-center gap-1', className)}
      data-testid="tag-chip-list"
    >
      {visibleTags.map((tag) => (
        <TagChip key={tag.Id} tag={tag} size={size} />
      ))}
      {overflowCount > 0 && (
        <span
          className={cn(
            'text-muted-foreground font-medium',
            size === 'sm' ? 'text-[10px]' : 'text-xs'
          )}
          title={tags.slice(maxVisible).map((t) => t.Name).join(', ')}
          data-testid="tag-chip-overflow"
        >
          {overflowText(overflowCount)}
        </span>
      )}
    </div>
  );
}

export const TagChipList = memo(TagChipListComponent);
