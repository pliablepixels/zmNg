import { describe, it, expect } from 'vitest';
import {
  isProfileNameAvailable,
  validateProfileNameFormat,
  validateProfileUrl,
} from '../profile-validation';
import type { Profile } from '../../api/types';

describe('Profile Validation', () => {
  const profiles: Profile[] = [
    {
      id: '1',
      name: 'Home Server',
      portalUrl: 'https://home.example.com',
      apiUrl: 'https://home.example.com/zm/api',
      cgiUrl: 'https://home.example.com/zm/cgi-bin/nph-zms',
      createdAt: Date.now(),
    },
    {
      id: '2',
      name: 'Office Server',
      portalUrl: 'https://office.example.com',
      apiUrl: 'https://office.example.com/zm/api',
      cgiUrl: 'https://office.example.com/zm/cgi-bin/nph-zms',
      createdAt: Date.now(),
    },
  ];

  describe('isProfileNameAvailable', () => {
    it('should return true for available name', () => {
      expect(isProfileNameAvailable('New Server', profiles)).toBe(true);
    });

    it('should return false for duplicate name', () => {
      expect(isProfileNameAvailable('Home Server', profiles)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isProfileNameAvailable('home server', profiles)).toBe(false);
      expect(isProfileNameAvailable('HOME SERVER', profiles)).toBe(false);
      expect(isProfileNameAvailable('HoMe SeRvEr', profiles)).toBe(false);
    });

    it('should allow same name when excluding current profile', () => {
      expect(isProfileNameAvailable('Home Server', profiles, '1')).toBe(true);
    });

    it('should return false for duplicate name even with excludeId if different profile', () => {
      expect(isProfileNameAvailable('Office Server', profiles, '1')).toBe(false);
    });

    it('should handle empty profiles array', () => {
      expect(isProfileNameAvailable('Any Name', [])).toBe(true);
    });
  });

  describe('validateProfileNameFormat', () => {
    it('should accept valid names', () => {
      expect(validateProfileNameFormat('Home Server')).toBeNull();
      expect(validateProfileNameFormat('My ZM Server 123')).toBeNull();
      expect(validateProfileNameFormat('a')).toBeNull();
    });

    it('should reject empty names', () => {
      expect(validateProfileNameFormat('')).toBe('Profile name cannot be empty');
      expect(validateProfileNameFormat('   ')).toBe('Profile name cannot be empty');
    });

    it('should reject names over 100 characters', () => {
      const longName = 'a'.repeat(101);
      expect(validateProfileNameFormat(longName)).toBe(
        'Profile name must be 100 characters or less'
      );
    });

    it('should accept names exactly 100 characters', () => {
      const maxName = 'a'.repeat(100);
      expect(validateProfileNameFormat(maxName)).toBeNull();
    });
  });

  describe('validateProfileUrl', () => {
    it('should accept valid HTTP URLs', () => {
      expect(validateProfileUrl('http://example.com')).toBeNull();
      expect(validateProfileUrl('http://192.168.1.1')).toBeNull();
      expect(validateProfileUrl('http://localhost:8080')).toBeNull();
    });

    it('should accept valid HTTPS URLs', () => {
      expect(validateProfileUrl('https://example.com')).toBeNull();
      expect(validateProfileUrl('https://example.com:8443')).toBeNull();
      expect(validateProfileUrl('https://example.com/zm')).toBeNull();
    });

    it('should reject empty URLs', () => {
      expect(validateProfileUrl('')).toBe('URL cannot be empty');
      expect(validateProfileUrl('   ')).toBe('URL cannot be empty');
    });

    it('should reject invalid URL formats', () => {
      expect(validateProfileUrl('not a url')).toBe('Invalid URL format');
      expect(validateProfileUrl('example.com')).toBe('Invalid URL format');
      expect(validateProfileUrl('//example.com')).toBe('Invalid URL format');
    });

    it('should reject non-HTTP protocols', () => {
      expect(validateProfileUrl('ftp://example.com')).toBe(
        'URL must use HTTP or HTTPS protocol'
      );
      expect(validateProfileUrl('file:///path/to/file')).toBe(
        'URL must use HTTP or HTTPS protocol'
      );
      expect(validateProfileUrl('ws://example.com')).toBe(
        'URL must use HTTP or HTTPS protocol'
      );
    });
  });
});
