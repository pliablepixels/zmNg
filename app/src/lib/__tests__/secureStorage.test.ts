/**
 * Unit tests for secureStorage utilities (security-critical)
 *
 * Tests for the secure storage layer including:
 * - Platform-specific storage (native vs web)
 * - Encryption fallback when Web Crypto unavailable
 * - Auto-migration from legacy plaintext to encrypted
 * - Error handling for missing crypto API
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import {
  setSecureValue,
  getSecureValue,
  removeSecureValue,
  hasSecureValue,
  clearSecureStorage,
  getStorageInfo,
} from '../secureStorage';
import * as crypto from '../crypto';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
}));

vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    keys: vi.fn(),
  },
}));

vi.mock('../logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SecureStorage - Web Platform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('setSecureValue', () => {
    it('encrypts and stores value in localStorage on web', async () => {
      const key = 'test-key';
      const value = 'secret-password';

      await setSecureValue(key, value);

      const stored = localStorage.getItem('zmng_secure_test-key');
      expect(stored).toBeTruthy();
      expect(stored).not.toBe(value);
    });

    it('uses encryption for sensitive data', async () => {
      const password = 'MySecretPassword123!';
      await setSecureValue('password', password);

      const stored = localStorage.getItem('zmng_secure_password');
      expect(stored).not.toContain('MySecretPassword');
      expect(stored).not.toContain('123');
    });

    it('throws error when Web Crypto unavailable', async () => {
      vi.spyOn(crypto, 'isCryptoAvailable').mockReturnValue(false);

      await expect(setSecureValue('key', 'value')).rejects.toThrow(
        'Secure storage not available'
      );

      vi.restoreAllMocks();
    });

    it('handles encryption failures gracefully', async () => {
      vi.spyOn(crypto, 'encrypt').mockRejectedValueOnce(new Error('Encryption failed'));

      await expect(setSecureValue('key', 'value')).rejects.toThrow(
        'Failed to securely store value'
      );

      vi.restoreAllMocks();
    });

    it('stores multiple values independently', async () => {
      await setSecureValue('key1', 'value1');
      await setSecureValue('key2', 'value2');
      await setSecureValue('key3', 'value3');

      expect(localStorage.getItem('zmng_secure_key1')).toBeTruthy();
      expect(localStorage.getItem('zmng_secure_key2')).toBeTruthy();
      expect(localStorage.getItem('zmng_secure_key3')).toBeTruthy();
    });
  });

  describe('getSecureValue', () => {
    it('retrieves and decrypts value from localStorage', async () => {
      const key = 'test-key';
      const value = 'secret-value';

      await setSecureValue(key, value);
      const retrieved = await getSecureValue(key);

      expect(retrieved).toBe(value);
    });

    it('returns null for non-existent key', async () => {
      const retrieved = await getSecureValue('non-existent-key');
      expect(retrieved).toBeNull();
    });

    it('handles decryption of complex data', async () => {
      const complexValue = JSON.stringify({
        username: 'admin',
        password: 'secret123',
        token: 'abc-xyz-123',
      });

      await setSecureValue('credentials', complexValue);
      const retrieved = await getSecureValue('credentials');

      expect(retrieved).toBe(complexValue);
      expect(JSON.parse(retrieved!)).toEqual({
        username: 'admin',
        password: 'secret123',
        token: 'abc-xyz-123',
      });
    });

    it('returns raw value when crypto unavailable but data exists', async () => {
      const key = 'legacy-key';
      const value = 'plaintext-value';
      localStorage.setItem('zmng_secure_legacy-key', value);

      vi.spyOn(crypto, 'isCryptoAvailable').mockReturnValue(false);

      const retrieved = await getSecureValue(key);
      expect(retrieved).toBe(value);

      vi.restoreAllMocks();
    });

    it('migrates legacy encrypted data to new key', async () => {
      const key = 'migration-test';
      const value = 'test-value';

      const encryptSpy = vi.spyOn(crypto, 'encrypt');
      const decryptSpy = vi.spyOn(crypto, 'decrypt');
      const decryptLegacySpy = vi.spyOn(crypto, 'decryptLegacy');

      const legacyEncrypted = 'legacy-encrypted-data';
      localStorage.setItem('zmng_secure_migration-test', legacyEncrypted);

      decryptSpy.mockRejectedValueOnce(new Error('Decrypt failed'));
      decryptLegacySpy.mockResolvedValueOnce(value);
      encryptSpy.mockResolvedValueOnce('re-encrypted-data');

      const retrieved = await getSecureValue(key);

      expect(retrieved).toBe(value);
      expect(decryptLegacySpy).toHaveBeenCalledWith(legacyEncrypted);
      expect(encryptSpy).toHaveBeenCalledWith(value);
      expect(localStorage.getItem('zmng_secure_migration-test')).toBe('re-encrypted-data');

      vi.restoreAllMocks();
    });

    it('returns null for corrupted encrypted data', async () => {
      const key = 'corrupted-key';
      const isProbablyEncryptedSpy = vi.spyOn(crypto, 'isProbablyEncryptedPayload');
      isProbablyEncryptedSpy.mockReturnValue(true);

      localStorage.setItem('zmng_secure_corrupted-key', 'corrupted-encrypted-data');

      const retrieved = await getSecureValue(key);
      expect(retrieved).toBeNull();

      vi.restoreAllMocks();
    });

    it('returns raw value for legacy plaintext data', async () => {
      const key = 'plaintext-key';
      const plainValue = 'legacy-plaintext';

      const isProbablyEncryptedSpy = vi.spyOn(crypto, 'isProbablyEncryptedPayload');
      isProbablyEncryptedSpy.mockReturnValue(false);

      localStorage.setItem('zmng_secure_plaintext-key', plainValue);

      const retrieved = await getSecureValue(key);
      expect(retrieved).toBe(plainValue);

      vi.restoreAllMocks();
    });
  });

  describe('removeSecureValue', () => {
    it('removes value from localStorage', async () => {
      const key = 'remove-test';
      await setSecureValue(key, 'value');

      expect(localStorage.getItem('zmng_secure_remove-test')).toBeTruthy();

      await removeSecureValue(key);

      expect(localStorage.getItem('zmng_secure_remove-test')).toBeNull();
    });

    it('handles removal of non-existent key', async () => {
      await expect(removeSecureValue('non-existent')).resolves.not.toThrow();
    });

    it('removes only specified key, not others', async () => {
      await setSecureValue('key1', 'value1');
      await setSecureValue('key2', 'value2');

      await removeSecureValue('key1');

      expect(localStorage.getItem('zmng_secure_key1')).toBeNull();
      expect(localStorage.getItem('zmng_secure_key2')).toBeTruthy();
    });
  });

  describe('hasSecureValue', () => {
    it('returns true when value exists', async () => {
      await setSecureValue('exists', 'value');
      const exists = await hasSecureValue('exists');

      expect(exists).toBe(true);
    });

    it('returns false when value does not exist', async () => {
      const exists = await hasSecureValue('does-not-exist');
      expect(exists).toBe(false);
    });

    it('returns true even for legacy plaintext values', async () => {
      localStorage.setItem('zmng_secure_legacy', 'plaintext');
      const exists = await hasSecureValue('legacy');

      expect(exists).toBe(true);
    });
  });

  describe('clearSecureStorage', () => {
    it('can be called without errors', async () => {
      // Store some values
      await setSecureValue('test_key', 'test_value');

      // clearSecureStorage should not throw
      await expect(clearSecureStorage()).resolves.not.toThrow();
    });

    it('handles empty storage', async () => {
      localStorage.clear();
      await expect(clearSecureStorage()).resolves.not.toThrow();
    });
  });

  describe('getStorageInfo', () => {
    it('returns web platform info with crypto available', () => {
      vi.spyOn(crypto, 'isCryptoAvailable').mockReturnValue(true);

      const info = getStorageInfo();

      expect(info.platform).toBe('web');
      expect(info.method).toBe('AES-GCM encryption (Web Crypto API)');
      expect(info.details).toBe('PBKDF2 key derivation with 100k iterations');

      vi.restoreAllMocks();
    });

    it('returns web platform info without crypto available', () => {
      vi.spyOn(crypto, 'isCryptoAvailable').mockReturnValue(false);

      const info = getStorageInfo();

      expect(info.platform).toBe('web');
      expect(info.method).toBe('Unencrypted localStorage (fallback)');
      expect(info.details).toBe('WARNING: No encryption available');

      vi.restoreAllMocks();
    });
  });
});

describe('SecureStorage - Native Platform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  });

  describe('iOS Platform', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
    });

    it('uses SecureStorage plugin for iOS', async () => {
      vi.mocked(SecureStorage.set).mockResolvedValue();

      await setSecureValue('ios-key', 'ios-value');

      expect(SecureStorage.set).toHaveBeenCalledWith('zmng_secure_ios-key', 'ios-value');
      expect(localStorage.getItem('zmng_secure_ios-key')).toBeNull();
    });

    it('retrieves from SecureStorage on iOS', async () => {
      vi.mocked(SecureStorage.get).mockResolvedValue('ios-value');

      const value = await getSecureValue('ios-key');

      expect(value).toBe('ios-value');
      expect(SecureStorage.get).toHaveBeenCalledWith('zmng_secure_ios-key');
    });

    it('returns iOS Keychain info', () => {
      const info = getStorageInfo();

      expect(info.platform).toBe('native');
      expect(info.method).toBe('@aparajita/capacitor-secure-storage');
      expect(info.details).toBe('iOS Keychain (hardware-encrypted)');
    });
  });

  describe('Android Platform', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    });

    it('uses SecureStorage plugin for Android', async () => {
      vi.mocked(SecureStorage.set).mockResolvedValue();

      await setSecureValue('android-key', 'android-value');

      expect(SecureStorage.set).toHaveBeenCalledWith('zmng_secure_android-key', 'android-value');
      expect(localStorage.getItem('zmng_secure_android-key')).toBeNull();
    });

    it('retrieves from SecureStorage on Android', async () => {
      vi.mocked(SecureStorage.get).mockResolvedValue('android-value');

      const value = await getSecureValue('android-key');

      expect(value).toBe('android-value');
      expect(SecureStorage.get).toHaveBeenCalledWith('zmng_secure_android-key');
    });

    it('returns Android Keystore info', () => {
      const info = getStorageInfo();

      expect(info.platform).toBe('native');
      expect(info.method).toBe('@aparajita/capacitor-secure-storage');
      expect(info.details).toBe('Android Keystore with AES-256-GCM');
    });
  });

  describe('Native platform operations', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
    });

    it('returns null when key does not exist', async () => {
      vi.mocked(SecureStorage.get).mockRejectedValue(new Error('Key not found'));

      const value = await getSecureValue('missing-key');

      expect(value).toBeNull();
    });

    it('removes value from native storage', async () => {
      vi.mocked(SecureStorage.remove).mockResolvedValue(undefined);

      await removeSecureValue('remove-key');

      expect(SecureStorage.remove).toHaveBeenCalledWith('zmng_secure_remove-key');
    });

    it('handles removal error gracefully', async () => {
      vi.mocked(SecureStorage.remove).mockRejectedValue(new Error('Remove failed'));

      await expect(removeSecureValue('key')).resolves.not.toThrow();
    });

    it('checks if value exists on native', async () => {
      vi.mocked(SecureStorage.get).mockResolvedValue('value');

      const exists = await hasSecureValue('exists-key');

      expect(exists).toBe(true);
    });

    it('returns false for non-existent value on native', async () => {
      vi.mocked(SecureStorage.get).mockRejectedValue(new Error('Not found'));

      const exists = await hasSecureValue('missing-key');

      expect(exists).toBe(false);
    });

    it('clears all secure storage on native', async () => {
      vi.mocked(SecureStorage.keys).mockResolvedValue([
        'zmng_secure_key1',
        'zmng_secure_key2',
        'other-app-key',
        'zmng_secure_key3',
      ]);
      vi.mocked(SecureStorage.remove).mockResolvedValue(undefined);

      await clearSecureStorage();

      expect(SecureStorage.remove).toHaveBeenCalledTimes(3);
      expect(SecureStorage.remove).toHaveBeenCalledWith('zmng_secure_key1');
      expect(SecureStorage.remove).toHaveBeenCalledWith('zmng_secure_key2');
      expect(SecureStorage.remove).toHaveBeenCalledWith('zmng_secure_key3');
      expect(SecureStorage.remove).not.toHaveBeenCalledWith('other-app-key');
    });

    it('handles errors during native clear', async () => {
      vi.mocked(SecureStorage.keys).mockRejectedValue(new Error('Failed to get keys'));

      await expect(clearSecureStorage()).resolves.not.toThrow();
    });

    it('handles individual removal failures during clear', async () => {
      vi.mocked(SecureStorage.keys).mockResolvedValue(['zmng_secure_key1', 'zmng_secure_key2']);
      vi.mocked(SecureStorage.remove)
        .mockRejectedValueOnce(new Error('Remove failed'))
        .mockResolvedValueOnce(undefined);

      await expect(clearSecureStorage()).resolves.not.toThrow();
      expect(SecureStorage.remove).toHaveBeenCalledTimes(2);
    });
  });
});

describe('SecureStorage - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
  });

  it('handles empty string values', async () => {
    await setSecureValue('empty', '');
    const retrieved = await getSecureValue('empty');

    expect(retrieved).toBe('');
  });

  it('handles special characters in keys', async () => {
    await setSecureValue('key-with-special_chars.123', 'value');
    const retrieved = await getSecureValue('key-with-special_chars.123');

    expect(retrieved).toBe('value');
  });

  it('handles special characters in values', async () => {
    const specialValue = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./\n\t\r';
    await setSecureValue('special', specialValue);
    const retrieved = await getSecureValue('special');

    expect(retrieved).toBe(specialValue);
  });

  it('handles unicode in values', async () => {
    const unicodeValue = 'Hello 世界 🌍 Привет مرحبا';
    await setSecureValue('unicode', unicodeValue);
    const retrieved = await getSecureValue('unicode');

    expect(retrieved).toBe(unicodeValue);
  });

  it('handles very long values', async () => {
    const longValue = 'a'.repeat(100000);
    await setSecureValue('long', longValue);
    const retrieved = await getSecureValue('long');

    expect(retrieved).toBe(longValue);
  });

  it('handles JSON strings', async () => {
    const jsonValue = JSON.stringify({ nested: { data: [1, 2, 3], flag: true } });
    await setSecureValue('json', jsonValue);
    const retrieved = await getSecureValue('json');

    expect(retrieved).toBe(jsonValue);
    expect(JSON.parse(retrieved!)).toEqual({ nested: { data: [1, 2, 3], flag: true } });
  });

  it('overwrites existing values', async () => {
    await setSecureValue('overwrite', 'original');
    const first = await getSecureValue('overwrite');
    expect(first).toBe('original');

    await setSecureValue('overwrite', 'updated');
    const second = await getSecureValue('overwrite');
    expect(second).toBe('updated');
  });
});
