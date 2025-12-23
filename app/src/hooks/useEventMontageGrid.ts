/**
 * Event Montage Grid Hook
 *
 * Manages grid layout state for event montage views.
 */

import { useState, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getMaxColsForWidth, EVENT_GRID_CONSTANTS } from '../lib/event-utils';

interface UseEventMontageGridProps {
  initialCols: number;
  containerRef: RefObject<HTMLElement | null>;
  onGridChange?: (cols: number) => void;
}

export const useEventMontageGrid = ({
  initialCols,
  containerRef,
  onGridChange,
}: UseEventMontageGridProps) => {
  const { t } = useTranslation();
  const [gridCols, setGridCols] = useState(initialCols);
  const [isCustomGridDialogOpen, setIsCustomGridDialogOpen] = useState(false);
  const [customCols, setCustomCols] = useState(initialCols.toString());
  const [isScreenTooSmall, setIsScreenTooSmall] = useState(false);
  const screenTooSmallRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      const width = containerRef.current?.clientWidth ?? window.innerWidth;
      const maxCols = getMaxColsForWidth(width, EVENT_GRID_CONSTANTS.MIN_CARD_WIDTH, EVENT_GRID_CONSTANTS.GAP);
      const tooSmall = gridCols > maxCols;
      setIsScreenTooSmall(tooSmall);
      if (tooSmall && !screenTooSmallRef.current) {
        toast.error(t('eventMontage.screen_too_small'));
      }
      screenTooSmallRef.current = tooSmall;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [gridCols, t, containerRef]);

  const handleApplyGridLayout = (cols: number) => {
    const width = containerRef.current?.clientWidth ?? window.innerWidth;
    const maxCols = getMaxColsForWidth(width, EVENT_GRID_CONSTANTS.MIN_CARD_WIDTH, EVENT_GRID_CONSTANTS.GAP);
    if (cols > maxCols) {
      toast.error(t('eventMontage.screen_too_small'));
      setIsScreenTooSmall(true);
      screenTooSmallRef.current = true;
      return;
    }

    setGridCols(cols);
    setIsScreenTooSmall(false);
    screenTooSmallRef.current = false;
    onGridChange?.(cols);
    toast.success(t('eventMontage.grid_layout_applied', { cols }));
  };

  const handleCustomGridSubmit = () => {
    const cols = parseInt(customCols, 10);

    if (isNaN(cols) || cols < 1 || cols > 10) {
      toast.error(t('eventMontage.invalid_columns'));
      return;
    }

    handleApplyGridLayout(cols);
    setIsCustomGridDialogOpen(false);
  };

  return {
    gridCols,
    setGridCols,
    isCustomGridDialogOpen,
    setIsCustomGridDialogOpen,
    customCols,
    setCustomCols,
    isScreenTooSmall,
    handleApplyGridLayout,
    handleCustomGridSubmit,
  };
};
