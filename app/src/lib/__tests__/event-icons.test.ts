/**
 * Unit tests for event-icons utility
 */

import { describe, it, expect } from 'vitest';
import { Move, Bell, Wifi, Link, Hand, Video, Circle } from 'lucide-react';
import { getEventCauseIcon, hasSpecificCauseIcon } from '../event-icons';

describe('getEventCauseIcon', () => {
  it('returns Move icon for Motion cause', () => {
    const icon = getEventCauseIcon('Motion');
    expect(icon).toBe(Move);
  });

  it('returns Bell icon for Alarm cause', () => {
    const icon = getEventCauseIcon('Alarm');
    expect(icon).toBe(Bell);
  });

  it('returns Wifi icon for Signal cause', () => {
    const icon = getEventCauseIcon('Signal');
    expect(icon).toBe(Wifi);
  });

  it('returns Link icon for Linked cause', () => {
    const icon = getEventCauseIcon('Linked');
    expect(icon).toBe(Link);
  });

  it('returns Hand icon for Forced Web cause', () => {
    const icon = getEventCauseIcon('Forced Web');
    expect(icon).toBe(Hand);
  });

  it('returns Video icon for Continuous cause', () => {
    const icon = getEventCauseIcon('Continuous');
    expect(icon).toBe(Video);
  });

  it('returns Circle icon for unknown causes', () => {
    const icon = getEventCauseIcon('UnknownCause');
    expect(icon).toBe(Circle);
  });

  it('returns Circle icon for empty string', () => {
    const icon = getEventCauseIcon('');
    expect(icon).toBe(Circle);
  });

  it('is case-sensitive (motion vs Motion)', () => {
    const lowercaseIcon = getEventCauseIcon('motion');
    const uppercaseIcon = getEventCauseIcon('Motion');
    expect(lowercaseIcon).toBe(Circle);
    expect(uppercaseIcon).toBe(Move);
  });

  it('returns Circle icon for custom ZoneMinder causes', () => {
    const icon = getEventCauseIcon('DoorSensor');
    expect(icon).toBe(Circle);
  });

  it('returns Move icon for Motion:All (prefix match)', () => {
    const icon = getEventCauseIcon('Motion:All');
    expect(icon).toBe(Move);
  });

  it('returns Move icon for Motion:Person (prefix match)', () => {
    const icon = getEventCauseIcon('Motion:Person');
    expect(icon).toBe(Move);
  });

  it('returns Bell icon for Alarm:Zone1 (prefix match)', () => {
    const icon = getEventCauseIcon('Alarm:Zone1');
    expect(icon).toBe(Bell);
  });
});

describe('hasSpecificCauseIcon', () => {
  it('returns true for known causes', () => {
    expect(hasSpecificCauseIcon('Motion')).toBe(true);
    expect(hasSpecificCauseIcon('Alarm')).toBe(true);
    expect(hasSpecificCauseIcon('Signal')).toBe(true);
    expect(hasSpecificCauseIcon('Linked')).toBe(true);
    expect(hasSpecificCauseIcon('Forced Web')).toBe(true);
    expect(hasSpecificCauseIcon('Continuous')).toBe(true);
  });

  it('returns false for unknown causes', () => {
    expect(hasSpecificCauseIcon('UnknownCause')).toBe(false);
    expect(hasSpecificCauseIcon('')).toBe(false);
    expect(hasSpecificCauseIcon('Custom')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(hasSpecificCauseIcon('motion')).toBe(false);
    expect(hasSpecificCauseIcon('MOTION')).toBe(false);
    expect(hasSpecificCauseIcon('Motion')).toBe(true);
  });

  it('returns true for prefix matches', () => {
    expect(hasSpecificCauseIcon('Motion:All')).toBe(true);
    expect(hasSpecificCauseIcon('Motion:Person')).toBe(true);
    expect(hasSpecificCauseIcon('Alarm:Zone1')).toBe(true);
    expect(hasSpecificCauseIcon('Signal:Lost')).toBe(true);
  });
});
