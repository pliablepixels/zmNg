/**
 * Event Pagination Hook
 *
 * Manages event pagination and infinite scroll behavior.
 */

import { useState, useCallback, useEffect } from 'react';
import type { RefObject } from 'react';

interface UseEventPaginationProps {
  defaultLimit: number;
  eventCount: number;
  containerRef: RefObject<HTMLElement | null>;
}

export const useEventPagination = ({ defaultLimit, eventCount, containerRef }: UseEventPaginationProps) => {
  const [eventLimit, setEventLimit] = useState(defaultLimit);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadNextPage = useCallback(() => {
    setIsLoadingMore(true);
    setEventLimit((prev) => prev + defaultLimit);
    setIsLoadingMore(false);
  }, [defaultLimit]);

  // Detect scroll to bottom for infinite scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Trigger load when user scrolls within 500px of bottom
      if (scrollHeight - (scrollTop + clientHeight) < 500 && !isLoadingMore && eventCount >= eventLimit) {
        loadNextPage();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [eventLimit, isLoadingMore, loadNextPage, eventCount, containerRef]);

  return {
    eventLimit,
    isLoadingMore,
    loadNextPage,
  };
};
