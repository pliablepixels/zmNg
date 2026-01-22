import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GroupFilterSelect } from '../GroupFilterSelect';
import { useGroups } from '../../../hooks/useGroups';
import { useGroupFilter } from '../../../hooks/useGroupFilter';
import type { GroupData } from '../../../api/types';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../hooks/useGroups', () => ({
  useGroups: vi.fn(),
}));

vi.mock('../../../hooks/useGroupFilter', () => ({
  useGroupFilter: vi.fn(),
}));

const mockGroups: GroupData[] = [
  {
    Group: { Id: '1', Name: 'Inside', ParentId: null },
    Monitor: [{ Id: '1' }, { Id: '2' }],
  },
  {
    Group: { Id: '2', Name: 'Outside', ParentId: null },
    Monitor: [{ Id: '3' }],
  },
  {
    Group: { Id: '3', Name: 'Downstairs', ParentId: '1' },
    Monitor: [{ Id: '4' }],
  },
];

const mockSetSelectedGroup = vi.fn();

describe('GroupFilterSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useGroupFilter).mockReturnValue({
      selectedGroupId: null,
      setSelectedGroup: mockSetSelectedGroup,
      clearGroupFilter: vi.fn(),
      isFilterActive: false,
      filteredMonitorIds: [],
      selectedGroupName: null,
    });
  });

  it('returns null when no groups exist', () => {
    vi.mocked(useGroups).mockReturnValue({
      groups: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      getGroupMonitorIds: vi.fn(),
      hasGroups: false,
    });

    const { container } = render(<GroupFilterSelect />);
    expect(container.firstChild).toBeNull();
  });

  it('shows loading skeleton when loading', () => {
    vi.mocked(useGroups).mockReturnValue({
      groups: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      getGroupMonitorIds: vi.fn(),
      hasGroups: false,
    });

    const { container } = render(<GroupFilterSelect />);
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders select when groups exist', () => {
    vi.mocked(useGroups).mockReturnValue({
      groups: mockGroups,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      getGroupMonitorIds: vi.fn(),
      hasGroups: true,
    });

    render(<GroupFilterSelect />);
    expect(screen.getByTestId('group-filter-select')).toBeInTheDocument();
  });

  it('shows "All Monitors" when no group is selected', () => {
    vi.mocked(useGroups).mockReturnValue({
      groups: mockGroups,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      getGroupMonitorIds: vi.fn(),
      hasGroups: true,
    });

    render(<GroupFilterSelect />);
    expect(screen.getByText('groups.all_monitors')).toBeInTheDocument();
  });

  it('shows selected group name when filter is active', () => {
    vi.mocked(useGroups).mockReturnValue({
      groups: mockGroups,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      getGroupMonitorIds: vi.fn(),
      hasGroups: true,
    });

    vi.mocked(useGroupFilter).mockReturnValue({
      selectedGroupId: '1',
      setSelectedGroup: mockSetSelectedGroup,
      clearGroupFilter: vi.fn(),
      isFilterActive: true,
      filteredMonitorIds: ['1', '2', '4'],
      selectedGroupName: 'Inside',
    });

    render(<GroupFilterSelect />);
    expect(screen.getByText('Inside')).toBeInTheDocument();
  });
});
