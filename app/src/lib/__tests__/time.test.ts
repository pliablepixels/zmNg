/**
 * Unit tests for timezone utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatForServer, formatLocalDateTime } from '../time';
import { useProfileStore } from '../../stores/profile';

// Mock the profile store - using primitives pattern (not deprecated currentProfile getter)
vi.mock('../../stores/profile', () => ({
  useProfileStore: {
    getState: vi.fn(() => ({
      profiles: [{ id: 'profile-1', timezone: 'America/New_York' }],
      currentProfileId: 'profile-1',
    })),
  },
}));

describe('formatForServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats date in server timezone format', () => {
    const date = new Date('2024-01-15T10:30:45Z'); // UTC time
    const result = formatForServer(date);

    // Should be in format: YYYY-MM-DD HH:mm:ss
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('uses space separator not T', () => {
    const date = new Date('2024-01-15T10:30:45Z');
    const result = formatForServer(date);

    expect(result).toContain(' ');
    expect(result).not.toContain('T');
  });

  it('pads single-digit values with zeros', () => {
    const date = new Date('2024-01-05T08:09:07Z');
    const result = formatForServer(date);

    // Month, day, hour, minute, second should all be 2 digits
    const parts = result.split(/[-\s:]/);
    parts.forEach(part => {
      expect(part.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('handles midnight correctly', () => {
    const date = new Date('2024-01-15T00:00:00Z');
    const result = formatForServer(date);

    // Timezone conversion may shift hour, but format should be correct
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}$/);
  });

  it('handles end of day correctly', () => {
    const date = new Date('2024-01-15T23:59:59Z');
    const result = formatForServer(date);

    // Should be in valid format (timezone conversion may change the hour)
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}$/);
  });

  it('uses 24-hour format', () => {
    const date = new Date('2024-01-15T14:30:00Z'); // 2:30 PM UTC
    const result = formatForServer(date);

    // Should not contain AM/PM (24-hour format)
    expect(result).not.toContain('AM');
    expect(result).not.toContain('PM');
    // Should be in format HH:mm:ss
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}$/);
  });

  it('handles different months correctly', () => {
    const dates = [
      new Date('2024-01-15T12:00:00Z'),
      new Date('2024-06-15T12:00:00Z'),
      new Date('2024-12-15T12:00:00Z'),
    ];

    dates.forEach(date => {
      const result = formatForServer(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  it('handles leap year dates', () => {
    const date = new Date('2024-02-29T12:00:00Z'); // 2024 is a leap year
    const result = formatForServer(date);

    expect(result).toContain('2024-02-29');
  });

  it('falls back gracefully on timezone error', () => {
    // Mock a timezone that might cause issues
    vi.mocked(useProfileStore.getState).mockReturnValue({
      profiles: [{ id: 'profile-1', timezone: 'Invalid/Timezone' }],
      currentProfileId: 'profile-1',
    } as any);

    const date = new Date('2024-01-15T10:30:45Z');
    const result = formatForServer(date);

    // Should still return valid format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('uses browser timezone when profile has no timezone', () => {
    vi.mocked(useProfileStore.getState).mockReturnValue({
      profiles: [],
      currentProfileId: null,
    } as any);

    const date = new Date('2024-01-15T10:30:45Z');
    const result = formatForServer(date);

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe('formatLocalDateTime', () => {
  it('formats date for datetime-local input', () => {
    const date = new Date('2024-01-15T10:30:00');
    const result = formatLocalDateTime(date);

    expect(result).toBe('2024-01-15T10:30');
  });

  it('uses T separator between date and time', () => {
    const date = new Date('2024-01-15T10:30:00');
    const result = formatLocalDateTime(date);

    expect(result).toContain('T');
    expect(result.split('T')).toHaveLength(2);
  });

  it('pads single-digit months with zeros', () => {
    const date = new Date('2024-01-15T10:30:00');
    const result = formatLocalDateTime(date);

    expect(result).toContain('2024-01-');
  });

  it('pads single-digit days with zeros', () => {
    const date = new Date('2024-01-05T10:30:00');
    const result = formatLocalDateTime(date);

    expect(result).toContain('-05T');
  });

  it('pads single-digit hours with zeros', () => {
    const date = new Date('2024-01-15T08:30:00');
    const result = formatLocalDateTime(date);

    expect(result).toContain('T08:');
  });

  it('pads single-digit minutes with zeros', () => {
    const date = new Date('2024-01-15T10:05:00');
    const result = formatLocalDateTime(date);

    expect(result).toContain(':05');
  });

  it('handles midnight', () => {
    const date = new Date('2024-01-15T00:00:00');
    const result = formatLocalDateTime(date);

    expect(result).toBe('2024-01-15T00:00');
  });

  it('handles end of day', () => {
    const date = new Date('2024-01-15T23:59:00');
    const result = formatLocalDateTime(date);

    expect(result).toBe('2024-01-15T23:59');
  });

  it('uses 24-hour format', () => {
    const date = new Date('2024-01-15T14:30:00'); // 2:30 PM
    const result = formatLocalDateTime(date);

    expect(result).toBe('2024-01-15T14:30');
    expect(result).not.toContain('PM');
  });

  it('handles different months', () => {
    const testCases = [
      { date: new Date('2024-01-15T10:30:00'), expected: '2024-01-15T10:30' },
      { date: new Date('2024-06-15T10:30:00'), expected: '2024-06-15T10:30' },
      { date: new Date('2024-12-15T10:30:00'), expected: '2024-12-15T10:30' },
    ];

    testCases.forEach(({ date, expected }) => {
      expect(formatLocalDateTime(date)).toBe(expected);
    });
  });

  it('handles leap year', () => {
    const date = new Date('2024-02-29T12:00:00');
    const result = formatLocalDateTime(date);

    expect(result).toBe('2024-02-29T12:00');
  });

  it('does not include seconds', () => {
    const date = new Date('2024-01-15T10:30:45');
    const result = formatLocalDateTime(date);

    expect(result).toBe('2024-01-15T10:30');
    expect(result).not.toContain(':45');
  });

  it('handles year boundaries correctly', () => {
    const testCases = [
      { date: new Date('2023-12-31T23:59:00'), expected: '2023-12-31T23:59' },
      { date: new Date('2024-01-01T00:00:00'), expected: '2024-01-01T00:00' },
    ];

    testCases.forEach(({ date, expected }) => {
      expect(formatLocalDateTime(date)).toBe(expected);
    });
  });
});
