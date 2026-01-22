/**
 * Group Filter Select Component
 *
 * Dropdown select for filtering monitors by group.
 * Displays groups hierarchically with indentation for child groups.
 *
 * Features:
 * - Hierarchical group display
 * - Monitor count per group
 * - "All Monitors" option to clear filter
 * - Persists selection in profile settings
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useGroups } from '../../hooks/useGroups';
import { useGroupFilter } from '../../hooks/useGroupFilter';
import { buildGroupHierarchy } from '../../lib/filters';

interface GroupFilterSelectProps {
  /** Optional className for the trigger button */
  className?: string;
}

/**
 * Dropdown select for filtering monitors by group.
 * Returns null if no groups are available.
 */
export function GroupFilterSelect({ className }: GroupFilterSelectProps) {
  const { t } = useTranslation();
  const { groups, hasGroups, isLoading } = useGroups();
  const { selectedGroupId, setSelectedGroup } = useGroupFilter();

  // Build hierarchical list for display
  const hierarchyItems = useMemo(() => {
    return buildGroupHierarchy(groups);
  }, [groups]);

  // Don't render if no groups exist
  if (!hasGroups && !isLoading) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-8 sm:h-9 w-[140px] bg-muted rounded-md animate-pulse" />
    );
  }

  const handleValueChange = (value: string) => {
    // 'all' means clear the filter
    setSelectedGroup(value === 'all' ? null : value);
  };

  return (
    <Select
      value={selectedGroupId ?? 'all'}
      onValueChange={handleValueChange}
    >
      <SelectTrigger
        className={`h-8 sm:h-9 w-[140px] sm:w-[170px] ${className ?? ''}`}
        data-testid="group-filter-select"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <SelectValue placeholder={t('groups.filter_by_group')}>
            <span className="truncate">
              {selectedGroupId
                ? hierarchyItems.find((h) => h.group.Group.Id === selectedGroupId)?.group.Group.Name
                : t('groups.all_monitors')}
            </span>
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" data-testid="group-filter-all">
          {t('groups.all_monitors')}
        </SelectItem>
        {hierarchyItems.map(({ group, level, monitorCount }) => (
          <SelectItem
            key={group.Group.Id}
            value={group.Group.Id}
            data-testid={`group-filter-${group.Group.Id}`}
          >
            <span
              className="flex items-center gap-1"
              style={{ paddingLeft: `${level * 12}px` }}
            >
              <span className="truncate">{group.Group.Name}</span>
              <span className="text-xs text-muted-foreground">
                ({monitorCount})
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
