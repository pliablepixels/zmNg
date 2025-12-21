import { describe, it, expect } from 'vitest';
import { parseMonitorRotation, getMonitorAspectRatio } from '../monitor-rotation';

describe('parseMonitorRotation', () => {
  it('returns none for empty values', () => {
    expect(parseMonitorRotation(null)).toEqual({ kind: 'none' });
    expect(parseMonitorRotation(undefined)).toEqual({ kind: 'none' });
    expect(parseMonitorRotation('  ')).toEqual({ kind: 'none' });
  });

  it('handles flip values', () => {
    expect(parseMonitorRotation('FLIP_HORI')).toEqual({ kind: 'flip_horizontal' });
    expect(parseMonitorRotation('FLIP_VERT')).toEqual({ kind: 'flip_vertical' });
  });

  it('handles rotate values with and without prefix', () => {
    expect(parseMonitorRotation('ROTATE_90')).toEqual({ kind: 'degrees', degrees: 90 });
    expect(parseMonitorRotation('180')).toEqual({ kind: 'degrees', degrees: 180 });
  });

  it('normalizes rotate 0 to none', () => {
    expect(parseMonitorRotation('ROTATE_0')).toEqual({ kind: 'none' });
    expect(parseMonitorRotation('0')).toEqual({ kind: 'none' });
    expect(parseMonitorRotation('360')).toEqual({ kind: 'none' });
  });

  it('returns unknown for invalid values', () => {
    expect(parseMonitorRotation('ROTATE_X')).toEqual({ kind: 'unknown' });
  });
});

describe('getMonitorAspectRatio', () => {
  it('returns undefined for invalid dimensions', () => {
    expect(getMonitorAspectRatio('0', '1080', 'ROTATE_0')).toBeUndefined();
    expect(getMonitorAspectRatio('1920', '0', 'ROTATE_0')).toBeUndefined();
    expect(getMonitorAspectRatio('nope', '1080', 'ROTATE_0')).toBeUndefined();
  });

  it('keeps aspect ratio when rotation is none or flip', () => {
    expect(getMonitorAspectRatio('1920', '1080', 'ROTATE_0')).toBe('1920 / 1080');
    expect(getMonitorAspectRatio('1920', '1080', 'FLIP_HORI')).toBe('1920 / 1080');
  });

  it('swaps dimensions for 90/270 rotations', () => {
    expect(getMonitorAspectRatio('1920', '1080', 'ROTATE_90')).toBe('1080 / 1920');
    expect(getMonitorAspectRatio('1920', '1080', '270')).toBe('1080 / 1920');
  });
});
