import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useGroups } from '../useGroups';
import { getGroups } from '../../api/groups';
import { useCurrentProfile } from '../useCurrentProfile';
import type { GroupData } from '../../api/types';

// Mock dependencies
vi.mock('../../api/groups', () => ({
  getGroups: vi.fn(),
}));

vi.mock('../useCurrentProfile', () => ({
  useCurrentProfile: vi.fn(),
}));

vi.mock('../../stores/auth', () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: true }),
}));

const mockGroups: GroupData[] = [
  {
    Group: { Id: '1', Name: 'Inside', ParentId: null },
    Monitor: [{ Id: '1', Name: 'Living Room' }, { Id: '2', Name: 'Kitchen' }],
  },
  {
    Group: { Id: '2', Name: 'Outside', ParentId: null },
    Monitor: [{ Id: '3', Name: 'Driveway' }],
  },
  {
    Group: { Id: '3', Name: 'Downstairs', ParentId: '1' },
    Monitor: [{ Id: '4', Name: 'Basement' }],
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCurrentProfile).mockReturnValue({
      currentProfile: { id: 'profile-1', name: 'Test', apiUrl: '', portalUrl: '', cgiUrl: '', isDefault: true, createdAt: 0 },
      settings: {} as never,
      hasProfile: true,
    });
  });

  it('fetches groups successfully', async () => {
    vi.mocked(getGroups).mockResolvedValue({ groups: mockGroups });

    const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.groups).toHaveLength(3);
    expect(result.current.hasGroups).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('returns empty groups when none exist', async () => {
    vi.mocked(getGroups).mockResolvedValue({ groups: [] });

    const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.groups).toHaveLength(0);
    expect(result.current.hasGroups).toBe(false);
  });

  it('handles fetch error', async () => {
    vi.mocked(getGroups).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
  });

  it('getGroupMonitorIds returns monitors for a group', async () => {
    vi.mocked(getGroups).mockResolvedValue({ groups: mockGroups });

    const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Inside group has monitors 1, 2, plus child group (Downstairs) with monitor 4
    const insideMonitors = result.current.getGroupMonitorIds('1');
    expect(insideMonitors).toContain('1');
    expect(insideMonitors).toContain('2');
    expect(insideMonitors).toContain('4'); // From child group
    expect(insideMonitors).toHaveLength(3);
  });

  it('getGroupMonitorIds returns only direct monitors for leaf group', async () => {
    vi.mocked(getGroups).mockResolvedValue({ groups: mockGroups });

    const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Downstairs has no children, just monitor 4
    const downstairsMonitors = result.current.getGroupMonitorIds('3');
    expect(downstairsMonitors).toEqual(['4']);
  });

  it('getGroupMonitorIds returns empty array for non-existent group', async () => {
    vi.mocked(getGroups).mockResolvedValue({ groups: mockGroups });

    const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const nonExistent = result.current.getGroupMonitorIds('999');
    expect(nonExistent).toEqual([]);
  });

  it('does not fetch when no profile is selected', async () => {
    vi.mocked(useCurrentProfile).mockReturnValue({
      currentProfile: null,
      settings: {} as never,
      hasProfile: false,
    });

    const { result } = renderHook(() => useGroups(), { wrapper: createWrapper() });

    // Should not trigger fetch
    expect(getGroups).not.toHaveBeenCalled();
    expect(result.current.groups).toEqual([]);
  });
});
