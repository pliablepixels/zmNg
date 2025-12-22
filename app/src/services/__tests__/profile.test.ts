import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from '../profile';
import type { Profile } from '../../api/types';

// Mock secure storage
vi.mock('../../lib/secureStorage', () => ({
  setSecureValue: vi.fn(),
  getSecureValue: vi.fn(),
  removeSecureValue: vi.fn(),
}));

vi.mock('../../lib/logger', () => ({
  log: {
    profile: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { setSecureValue, getSecureValue, removeSecureValue } from '../../lib/secureStorage';

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('savePassword', () => {
    it('should save password to secure storage', async () => {
      vi.mocked(setSecureValue).mockResolvedValue(undefined);

      await ProfileService.savePassword('profile-123', 'my-secure-password');

      expect(setSecureValue).toHaveBeenCalledWith('password_profile-123', 'my-secure-password');
    });

    it('should throw error if storage fails', async () => {
      vi.mocked(setSecureValue).mockRejectedValue(new Error('Storage error'));

      await expect(ProfileService.savePassword('profile-123', 'password')).rejects.toThrow(
        'Failed to securely store password'
      );
    });
  });

  describe('getPassword', () => {
    it('should retrieve password from secure storage', async () => {
      vi.mocked(getSecureValue).mockResolvedValue('retrieved-password');

      const password = await ProfileService.getPassword('profile-123');

      expect(getSecureValue).toHaveBeenCalledWith('password_profile-123');
      expect(password).toBe('retrieved-password');
    });

    it('should return undefined if password not found', async () => {
      vi.mocked(getSecureValue).mockResolvedValue(null);

      const password = await ProfileService.getPassword('profile-123');

      expect(password).toBeUndefined();
    });

    it('should return undefined and log error on storage failure', async () => {
      vi.mocked(getSecureValue).mockRejectedValue(new Error('Storage error'));

      const password = await ProfileService.getPassword('profile-123');

      expect(password).toBeUndefined();
    });
  });

  describe('deletePassword', () => {
    it('should remove password from secure storage', async () => {
      vi.mocked(removeSecureValue).mockResolvedValue(undefined);

      await ProfileService.deletePassword('profile-123');

      expect(removeSecureValue).toHaveBeenCalledWith('password_profile-123');
    });

    it('should not throw error if removal fails', async () => {
      vi.mocked(removeSecureValue).mockRejectedValue(new Error('Storage error'));

      await expect(ProfileService.deletePassword('profile-123')).resolves.toBeUndefined();
    });
  });

  describe('validateNameAvailability', () => {
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
      {
        id: '3',
        name: 'Demo Server',
        portalUrl: 'https://demo.example.com',
        apiUrl: 'https://demo.example.com/zm/api',
        cgiUrl: 'https://demo.example.com/zm/cgi-bin/nph-zms',
        createdAt: Date.now(),
      },
    ];

    it('should return true for available name', () => {
      const isAvailable = ProfileService.validateNameAvailability('New Server', profiles);

      expect(isAvailable).toBe(true);
    });

    it('should return false for duplicate name', () => {
      const isAvailable = ProfileService.validateNameAvailability('Home Server', profiles);

      expect(isAvailable).toBe(false);
    });

    it('should be case insensitive', () => {
      const isAvailable1 = ProfileService.validateNameAvailability('home server', profiles);
      const isAvailable2 = ProfileService.validateNameAvailability('HOME SERVER', profiles);
      const isAvailable3 = ProfileService.validateNameAvailability('HoMe SeRvEr', profiles);

      expect(isAvailable1).toBe(false);
      expect(isAvailable2).toBe(false);
      expect(isAvailable3).toBe(false);
    });

    it('should allow same name when excluding current profile', () => {
      const isAvailable = ProfileService.validateNameAvailability('Home Server', profiles, '1');

      expect(isAvailable).toBe(true);
    });

    it('should return false for duplicate name even with excludeId if different profile', () => {
      const isAvailable = ProfileService.validateNameAvailability('Office Server', profiles, '1');

      expect(isAvailable).toBe(false);
    });

    it('should handle empty profiles array', () => {
      const isAvailable = ProfileService.validateNameAvailability('Any Name', []);

      expect(isAvailable).toBe(true);
    });

    it('should handle whitespace differences', () => {
      const isAvailable = ProfileService.validateNameAvailability('  Home Server  ', profiles);

      // Note: Current implementation doesn't trim, so this should be available
      // This might be a bug worth noting - names with leading/trailing spaces are considered different
      expect(isAvailable).toBe(true);
    });
  });
});
