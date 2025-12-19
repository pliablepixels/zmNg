/**
 * URL Builder Tests
 *
 * Comprehensive tests for ZoneMinder URL generation functions.
 * Tests cover event images, videos, monitor streams, and various edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizePortalUrl,
  buildQueryString,
  buildUrl,
  getMonitorStreamUrl,
  getMonitorControlUrl,
  getEventImageUrl,
  getEventVideoUrl,
  getEventZmsUrl,
  getZmsControlUrl,
} from '../url-builder';

describe('normalizePortalUrl', () => {
  it('adds http:// prefix when protocol is missing', () => {
    expect(normalizePortalUrl('zm.example.com')).toBe('http://zm.example.com');
  });

  it('preserves https:// protocol', () => {
    expect(normalizePortalUrl('https://zm.example.com')).toBe('https://zm.example.com');
  });

  it('preserves http:// protocol', () => {
    expect(normalizePortalUrl('http://zm.example.com')).toBe('http://zm.example.com');
  });

  it('handles URL with path', () => {
    expect(normalizePortalUrl('zm.example.com/zm')).toBe('http://zm.example.com/zm');
  });
});

describe('buildQueryString', () => {
  it('builds query string from params', () => {
    const result = buildQueryString({ view: 'console', limit: 10 });
    expect(result).toBe('view=console&limit=10');
  });

  it('adds token parameter when provided', () => {
    const result = buildQueryString({ view: 'console' }, 'mytoken');
    expect(result).toBe('view=console&token=mytoken');
  });

  it('filters out undefined values', () => {
    const result = buildQueryString({ view: 'console', limit: undefined });
    expect(result).toBe('view=console');
  });

  it('handles empty params with token', () => {
    const result = buildQueryString({}, 'mytoken');
    expect(result).toBe('token=mytoken');
  });

  it('handles boolean values', () => {
    const result = buildQueryString({ enabled: true, disabled: false });
    expect(result).toBe('enabled=true&disabled=false');
  });
});

describe('buildUrl', () => {
  it('builds complete URL with query string', () => {
    const result = buildUrl('https://zm.com', '/index.php', { view: 'console' });
    expect(result).toBe('https://zm.com/index.php?view=console');
  });

  it('builds URL with token', () => {
    const result = buildUrl('https://zm.com', '/index.php', { view: 'console' }, 'token123');
    expect(result).toBe('https://zm.com/index.php?view=console&token=token123');
  });

  it('handles path without leading slash', () => {
    const result = buildUrl('https://zm.com', 'api/monitors', { limit: 5 });
    expect(result).toBe('https://zm.com/api/monitors?limit=5');
  });

  it('handles URL without params', () => {
    const result = buildUrl('https://zm.com', '/index.php', {});
    expect(result).toBe('https://zm.com/index.php');
  });

  it('normalizes portal URL', () => {
    const result = buildUrl('zm.com', '/index.php', { view: 'console' });
    expect(result).toBe('http://zm.com/index.php?view=console');
  });
});

describe('getMonitorStreamUrl', () => {
  const cgiUrl = 'https://zm.com/cgi-bin/nph-zms';
  const monitorId = '1';

  it('generates basic stream URL', () => {
    const result = getMonitorStreamUrl(cgiUrl, monitorId);
    expect(result).toContain('/cgi-bin/nph-zms');
    expect(result).toContain('monitor=1');
    expect(result).toContain('mode=jpeg');
  });

  it('includes all stream options', () => {
    const result = getMonitorStreamUrl(cgiUrl, monitorId, {
      mode: 'stream',
      scale: 50,
      width: 640,
      height: 480,
      maxfps: 10,
      buffer: 1000,
      token: 'abc123',
      connkey: 12345,
    });

    expect(result).toContain('mode=stream');
    expect(result).toContain('scale=50');
    expect(result).toContain('width=640px');
    expect(result).toContain('height=480px');
    expect(result).toContain('maxfps=10');
    expect(result).toContain('buffer=1000');
    expect(result).toContain('token=abc123');
    expect(result).toContain('connkey=12345');
  });

  it('adds cache buster when provided', () => {
    const result = getMonitorStreamUrl(cgiUrl, monitorId, {
      cacheBuster: 1234567890,
    });
    expect(result).toContain('_t=1234567890');
  });
});

describe('getMonitorControlUrl', () => {
  const portalUrl = 'https://zm.com';
  const monitorId = '1';

  it('generates PTZ control URL', () => {
    const result = getMonitorControlUrl(portalUrl, monitorId, 'moveRelUp');
    expect(result).toContain('/index.php');
    expect(result).toContain('view=request');
    expect(result).toContain('request=control');
    expect(result).toContain('id=1');
    expect(result).toContain('control=moveRelUp');
  });

  it('includes token when provided', () => {
    const result = getMonitorControlUrl(portalUrl, monitorId, 'moveRelUp', {
      token: 'mytoken',
    });
    expect(result).toContain('token=mytoken');
  });
});

describe('getEventImageUrl', () => {
  const portalUrl = 'https://zm.com';
  const eventId = '123';

  it('generates image URL with frame number', () => {
    const result = getEventImageUrl(portalUrl, eventId, 10);
    expect(result).toContain('/index.php');
    expect(result).toContain('view=image');
    expect(result).toContain('eid=123');
    expect(result).toContain('fid=10');
  });

  it('handles snapshot frame', () => {
    const result = getEventImageUrl(portalUrl, eventId, 'snapshot');
    expect(result).toContain('fid=snapshot');
  });

  it('handles objdetect frame', () => {
    const result = getEventImageUrl(portalUrl, eventId, 'objdetect');
    expect(result).toContain('fid=objdetect');
  });

  it('includes dimensions when provided', () => {
    const result = getEventImageUrl(portalUrl, eventId, 'snapshot', {
      width: 640,
      height: 480,
    });
    expect(result).toContain('width=640');
    expect(result).toContain('height=480');
  });

  it('includes token when provided', () => {
    const result = getEventImageUrl(portalUrl, eventId, 1, {
      token: 'mytoken',
    });
    expect(result).toContain('token=mytoken');
  });
});

describe('getEventVideoUrl', () => {
  const portalUrl = 'https://zm.com';
  const eventId = '9';

  it('generates MP4 video URL with default h264 format', () => {
    const result = getEventVideoUrl(portalUrl, eventId);
    expect(result).toBe('https://zm.com/index.php?mode=mpeg&format=h264&eid=9&view=view_video');
  });

  it('includes token parameter', () => {
    const result = getEventVideoUrl(portalUrl, eventId, {
      token: 'mytoken123',
    });
    expect(result).toBe('https://zm.com/index.php?mode=mpeg&format=h264&eid=9&view=view_video&token=mytoken123');
  });

  it('supports h265 format', () => {
    const result = getEventVideoUrl(portalUrl, eventId, {
      format: 'h265',
      token: 'mytoken',
    });
    expect(result).toContain('format=h265');
  });

  it('uses mode=mpeg for MP4 playback', () => {
    const result = getEventVideoUrl(portalUrl, eventId);
    expect(result).toContain('mode=mpeg');
  });

  it('uses view=view_video', () => {
    const result = getEventVideoUrl(portalUrl, eventId);
    expect(result).toContain('view=view_video');
  });

  it('normalizes portal URL without protocol', () => {
    const result = getEventVideoUrl('zm.com', eventId);
    expect(result).toContain('http://zm.com');
  });
});

describe('getEventZmsUrl', () => {
  const portalUrl = 'https://zm.com';
  const eventId = '123';

  it('generates ZMS event playback URL with defaults', () => {
    const result = getEventZmsUrl(portalUrl, eventId);
    expect(result).toContain('/cgi-bin/nph-zms');
    expect(result).toContain('mode=jpeg');
    expect(result).toContain('source=event');
    expect(result).toContain('event=123');
    expect(result).toContain('frame=1');
    expect(result).toContain('rate=100');
    expect(result).toContain('maxfps=30');
    expect(result).toContain('replay=single');
    expect(result).toContain('scale=100');
  });

  it('accepts custom playback options', () => {
    const result = getEventZmsUrl(portalUrl, eventId, {
      frame: 50,
      rate: 200,
      maxfps: 60,
      replay: 'gapless',
      scale: 50,
    });

    expect(result).toContain('frame=50');
    expect(result).toContain('rate=200');
    expect(result).toContain('maxfps=60');
    expect(result).toContain('replay=gapless');
    expect(result).toContain('scale=50');
  });

  it('includes connkey when provided', () => {
    const result = getEventZmsUrl(portalUrl, eventId, {
      connkey: 'conn123',
    });
    expect(result).toContain('connkey=conn123');
  });

  it('includes token when provided', () => {
    const result = getEventZmsUrl(portalUrl, eventId, {
      token: 'mytoken',
    });
    expect(result).toContain('token=mytoken');
  });
});

describe('getZmsControlUrl', () => {
  const portalUrl = 'https://zm.com';
  const command = 1; // CMD_PLAY
  const connkey = 'conn123';

  it('generates ZMS control URL', () => {
    const result = getZmsControlUrl(portalUrl, command, connkey);
    expect(result).toContain('/index.php');
    expect(result).toContain('command=1');
    expect(result).toContain('connkey=conn123');
    expect(result).toContain('view=request');
    expect(result).toContain('request=stream');
  });

  it('includes offset when provided', () => {
    const result = getZmsControlUrl(portalUrl, command, connkey, {
      offset: 500,
    });
    expect(result).toContain('offset=500');
  });

  it('includes token when provided', () => {
    const result = getZmsControlUrl(portalUrl, command, connkey, {
      token: 'mytoken',
    });
    expect(result).toContain('token=mytoken');
  });
});

describe('Edge Cases', () => {
  it('handles special characters in event ID', () => {
    const result = getEventVideoUrl('https://zm.com', '123-456');
    expect(result).toContain('eid=123-456');
  });

  it('handles special characters in monitor ID', () => {
    const result = getMonitorStreamUrl('https://zm.com/cgi-bin', 'mon-1');
    expect(result).toContain('monitor=mon-1');
  });

  it('encodes token with special characters', () => {
    const result = getEventVideoUrl('https://zm.com', '9', {
      token: 'abc+def=ghi',
    });
    // URLSearchParams automatically encodes special characters
    expect(result).toContain('token=abc');
  });
});
