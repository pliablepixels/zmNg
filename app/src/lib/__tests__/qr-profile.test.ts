/**
 * Unit tests for QR profile import/export
 */

import { describe, it, expect } from 'vitest';
import { parseQRProfile, generateQRProfile, type ParsedProfileData } from '../qr-profile';

describe('parseQRProfile', () => {
  describe('valid QR codes', () => {
    it('parses minimal profile (name + portal only)', () => {
      const qrData = JSON.stringify({
        n: 'My Server',
        p: 'https://zm.example.com',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('My Server');
        expect(result.data.portalUrl).toBe('https://zm.example.com');
        expect(result.data.username).toBeUndefined();
        expect(result.data.password).toBeUndefined();
      }
    });

    it('parses profile with all fields', () => {
      const qrData = JSON.stringify({
        n: 'Home Camera',
        p: 'https://home.example.com',
        a: 'https://home.example.com/zm/api',
        c: 'https://home.example.com/zm/cgi-bin',
        u: 'admin',
        pw: 'secret123',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Home Camera');
        expect(result.data.portalUrl).toBe('https://home.example.com');
        expect(result.data.apiUrl).toBe('https://home.example.com/zm/api');
        expect(result.data.cgiUrl).toBe('https://home.example.com/zm/cgi-bin');
        expect(result.data.username).toBe('admin');
        expect(result.data.password).toBe('secret123');
      }
    });

    it('parses profile with only username (no password)', () => {
      const qrData = JSON.stringify({
        n: 'Test',
        p: 'https://test.com',
        u: 'viewer',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('viewer');
        expect(result.data.password).toBeUndefined();
      }
    });

    it('trims whitespace from values', () => {
      const qrData = JSON.stringify({
        n: '  My Server  ',
        p: '  https://zm.example.com  ',
        u: '  admin  ',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('My Server');
        expect(result.data.portalUrl).toBe('https://zm.example.com');
        expect(result.data.username).toBe('admin');
      }
    });

    it('accepts portal URL without protocol (will be added later)', () => {
      const qrData = JSON.stringify({
        n: 'Local Server',
        p: 'zm.local',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.portalUrl).toBe('zm.local');
      }
    });

    it('accepts localhost URLs', () => {
      const qrData = JSON.stringify({
        n: 'Dev Server',
        p: 'localhost:8080',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.portalUrl).toBe('localhost:8080');
      }
    });

    it('accepts http:// URLs', () => {
      const qrData = JSON.stringify({
        n: 'HTTP Server',
        p: 'http://internal.local/zm',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.portalUrl).toBe('http://internal.local/zm');
      }
    });
  });

  describe('invalid QR codes', () => {
    it('returns error for non-JSON content', () => {
      const result = parseQRProfile('not json at all');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('invalid_json');
      }
    });

    it('returns error for missing name', () => {
      const qrData = JSON.stringify({
        p: 'https://zm.example.com',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('missing_name');
      }
    });

    it('returns error for empty name', () => {
      const qrData = JSON.stringify({
        n: '',
        p: 'https://zm.example.com',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('missing_name');
      }
    });

    it('returns error for whitespace-only name', () => {
      const qrData = JSON.stringify({
        n: '   ',
        p: 'https://zm.example.com',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('missing_name');
      }
    });

    it('returns error for missing portal URL', () => {
      const qrData = JSON.stringify({
        n: 'My Server',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('missing_portal_url');
      }
    });

    it('returns error for empty portal URL', () => {
      const qrData = JSON.stringify({
        n: 'My Server',
        p: '',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('missing_portal_url');
      }
    });

    it('returns error for invalid portal URL (no dot or localhost)', () => {
      const qrData = JSON.stringify({
        n: 'My Server',
        p: 'invalid',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('invalid_portal_url');
      }
    });

    it('returns error for invalid portal URL (malformed full URL)', () => {
      const qrData = JSON.stringify({
        n: 'My Server',
        p: 'https://[invalid',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('invalid_portal_url');
      }
    });

    it('returns error for invalid API URL', () => {
      const qrData = JSON.stringify({
        n: 'My Server',
        p: 'https://zm.example.com',
        a: 'not-a-url',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('invalid_api_url');
      }
    });

    it('returns error for invalid CGI URL', () => {
      const qrData = JSON.stringify({
        n: 'My Server',
        p: 'https://zm.example.com',
        c: 'not-a-url',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('invalid_cgi_url');
      }
    });

    it('returns error for non-string name', () => {
      const qrData = JSON.stringify({
        n: 123,
        p: 'https://zm.example.com',
      });

      const result = parseQRProfile(qrData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('missing_name');
      }
    });
  });
});

describe('generateQRProfile', () => {
  it('generates minimal profile JSON', () => {
    const profile: ParsedProfileData = {
      name: 'Test Server',
      portalUrl: 'https://test.com',
    };

    const result = generateQRProfile(profile);
    const parsed = JSON.parse(result);

    expect(parsed.n).toBe('Test Server');
    expect(parsed.p).toBe('https://test.com');
    expect(parsed.a).toBeUndefined();
    expect(parsed.c).toBeUndefined();
    expect(parsed.u).toBeUndefined();
    expect(parsed.pw).toBeUndefined();
  });

  it('generates full profile JSON', () => {
    const profile: ParsedProfileData = {
      name: 'Full Server',
      portalUrl: 'https://full.com',
      apiUrl: 'https://full.com/api',
      cgiUrl: 'https://full.com/cgi',
      username: 'admin',
      password: 'pass123',
    };

    const result = generateQRProfile(profile);
    const parsed = JSON.parse(result);

    expect(parsed.n).toBe('Full Server');
    expect(parsed.p).toBe('https://full.com');
    expect(parsed.a).toBe('https://full.com/api');
    expect(parsed.c).toBe('https://full.com/cgi');
    expect(parsed.u).toBe('admin');
    expect(parsed.pw).toBe('pass123');
  });

  it('omits undefined optional fields', () => {
    const profile: ParsedProfileData = {
      name: 'Partial',
      portalUrl: 'https://partial.com',
      username: 'viewer',
      // password, apiUrl, cgiUrl are undefined
    };

    const result = generateQRProfile(profile);
    const parsed = JSON.parse(result);

    expect(Object.keys(parsed)).toEqual(['n', 'p', 'u']);
    expect(parsed.a).toBeUndefined();
    expect(parsed.c).toBeUndefined();
    expect(parsed.pw).toBeUndefined();
  });

  it('roundtrip: generate then parse returns same data', () => {
    const original: ParsedProfileData = {
      name: 'Roundtrip Test',
      portalUrl: 'https://roundtrip.example.com',
      apiUrl: 'https://roundtrip.example.com/api',
      cgiUrl: 'https://roundtrip.example.com/cgi-bin',
      username: 'testuser',
      password: 'testpass!@#',
    };

    const qrContent = generateQRProfile(original);
    const result = parseQRProfile(qrContent);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(original);
    }
  });
});
