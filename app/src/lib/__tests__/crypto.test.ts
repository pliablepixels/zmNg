/**
 * Unit tests for crypto utilities (security-critical)
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import {
  encrypt,
  decrypt,
  decryptLegacy,
  isCryptoAvailable,
  isProbablyEncryptedPayload,
  MIN_ENCRYPTED_BYTES,
} from '../crypto';

describe('isCryptoAvailable', () => {
  it('returns true when Web Crypto API is available', () => {
    expect(isCryptoAvailable()).toBe(true);
  });
});

describe('encrypt', () => {
  it('encrypts a simple string', async () => {
    const plaintext = 'Hello, World!';
    const encrypted = await encrypt(plaintext);

    expect(encrypted).toBeTruthy();
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(plaintext);
  });

  it('produces different ciphertext each time (random IV)', async () => {
    const plaintext = 'same text';
    const encrypted1 = await encrypt(plaintext);
    const encrypted2 = await encrypt(plaintext);

    // Should be different due to random IV
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('encrypts empty string', async () => {
    const encrypted = await encrypt('');

    expect(encrypted).toBeTruthy();
    expect(typeof encrypted).toBe('string');
  });

  it('encrypts string with special characters', async () => {
    const plaintext = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
    const encrypted = await encrypt(plaintext);

    expect(encrypted).toBeTruthy();
    expect(typeof encrypted).toBe('string');
  });

  it('encrypts string with unicode characters', async () => {
    const plaintext = 'Hello 世界 🌍';
    const encrypted = await encrypt(plaintext);

    expect(encrypted).toBeTruthy();
    expect(typeof encrypted).toBe('string');
  });

  it('encrypts long string', async () => {
    const plaintext = 'a'.repeat(10000);
    const encrypted = await encrypt(plaintext);

    expect(encrypted).toBeTruthy();
    expect(typeof encrypted).toBe('string');
  });

  it('produces base64 encoded output', async () => {
    const plaintext = 'test';
    const encrypted = await encrypt(plaintext);

    // Base64 should only contain valid characters
    expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('encrypts passwords securely', async () => {
    const password = 'MySecretPassword123!';
    const encrypted = await encrypt(password);

    // Encrypted password should not contain the original password
    expect(encrypted).not.toContain('MySecretPassword');
    expect(encrypted).not.toContain('123');
  });
});

describe('decrypt', () => {
  beforeAll(async () => {
    // Ensure crypto is available before tests run
    expect(isCryptoAvailable()).toBe(true);
  });

  it('decrypts an encrypted string', async () => {
    const plaintext = 'Hello, World!';
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('decrypts empty string', async () => {
    const plaintext = '';
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('decrypts string with special characters', async () => {
    const plaintext = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('decrypts string with unicode characters', async () => {
    const plaintext = 'Hello 世界 🌍';
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('decrypts long string', async () => {
    const plaintext = 'a'.repeat(10000);
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('throws error for invalid base64', async () => {
    await expect(decrypt('not-valid-base64!!!')).rejects.toThrow('Failed to decrypt data');
  });

  it('throws error for tampered data', async () => {
    const plaintext = 'test';
    const encrypted = await encrypt(plaintext);

    // Tamper with the encrypted data
    const tampered = encrypted.slice(0, -5) + 'AAAAA';

    await expect(decrypt(tampered)).rejects.toThrow('Failed to decrypt data');
  });

  it('throws error for truncated data', async () => {
    const plaintext = 'test';
    const encrypted = await encrypt(plaintext);

    // Truncate the encrypted data (remove IV portion)
    const truncated = encrypted.slice(5);

    await expect(decrypt(truncated)).rejects.toThrow('Failed to decrypt data');
  });

  it('throws error for empty string', async () => {
    await expect(decrypt('')).rejects.toThrow();
  });
});

describe('Round-trip encryption/decryption', () => {
  it('handles simple passwords', async () => {
    const password = 'password123';
    const encrypted = await encrypt(password);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(password);
  });

  it('handles complex passwords with symbols', async () => {
    const password = 'P@ssw0rd!#$%^&*()_+-=';
    const encrypted = await encrypt(password);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(password);
  });

  it('handles API keys', async () => {
    const apiKey = 'test_api_key_1234567890abcdefghijklmnopqrstuvwxyz';
    const encrypted = await encrypt(apiKey);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(apiKey);
  });

  it('handles URLs with credentials', async () => {
    const url = 'https://user:password@example.com:8443/zm';
    const encrypted = await encrypt(url);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(url);
  });

  it('handles JSON strings', async () => {
    const json = JSON.stringify({ username: 'admin', password: 'secret', apiKey: '12345' });
    const encrypted = await encrypt(json);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(json);
    expect(JSON.parse(decrypted)).toEqual({
      username: 'admin',
      password: 'secret',
      apiKey: '12345',
    });
  });

  it('handles multiline strings', async () => {
    const multiline = `Line 1
Line 2
Line 3`;
    const encrypted = await encrypt(multiline);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(multiline);
  });

  it('handles strings with null bytes', async () => {
    const withNull = 'before\x00after';
    const encrypted = await encrypt(withNull);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(withNull);
  });

  it('preserves whitespace', async () => {
    const withWhitespace = '  spaces  \n\ttabs\t  ';
    const encrypted = await encrypt(withWhitespace);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(withWhitespace);
  });

  it('handles repeated encryption/decryption', async () => {
    const plaintext = 'sensitive data';

    // Encrypt and decrypt multiple times
    let encrypted1 = await encrypt(plaintext);
    let decrypted1 = await decrypt(encrypted1);
    expect(decrypted1).toBe(plaintext);

    let encrypted2 = await encrypt(decrypted1);
    let decrypted2 = await decrypt(encrypted2);
    expect(decrypted2).toBe(plaintext);

    let encrypted3 = await encrypt(decrypted2);
    let decrypted3 = await decrypt(encrypted3);
    expect(decrypted3).toBe(plaintext);
  });

  it('produces different encrypted values for same plaintext', async () => {
    const plaintext = 'test data';

    const encrypted1 = await encrypt(plaintext);
    const encrypted2 = await encrypt(plaintext);
    const encrypted3 = await encrypt(plaintext);

    // All should be different (random IV)
    expect(encrypted1).not.toBe(encrypted2);
    expect(encrypted2).not.toBe(encrypted3);
    expect(encrypted1).not.toBe(encrypted3);

    // But all should decrypt to same value
    expect(await decrypt(encrypted1)).toBe(plaintext);
    expect(await decrypt(encrypted2)).toBe(plaintext);
    expect(await decrypt(encrypted3)).toBe(plaintext);
  });
});

describe('Security properties', () => {
  it('produces sufficiently long encrypted output', async () => {
    const plaintext = 'test';
    const encrypted = await encrypt(plaintext);

    // IV (12 bytes) + ciphertext should be longer than plaintext
    // Base64 encoded, so roughly 4/3 the size
    expect(encrypted.length).toBeGreaterThan(plaintext.length);
  });

  it('encrypted output has no readable plaintext', async () => {
    const plaintext = 'MyVerySecretPassword123';
    const encrypted = await encrypt(plaintext);

    // Encrypted should not contain any part of the plaintext
    expect(encrypted.toLowerCase()).not.toContain('secret');
    expect(encrypted.toLowerCase()).not.toContain('password');
    expect(encrypted).not.toContain('123');
  });

  it('different plaintexts produce different ciphertexts', async () => {
    const text1 = 'password1';
    const text2 = 'password2';

    const encrypted1 = await encrypt(text1);
    const encrypted2 = await encrypt(text2);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it('similar plaintexts produce completely different ciphertexts', async () => {
    const text1 = 'password';
    const text2 = 'passwor';  // One character different

    const encrypted1 = await encrypt(text1);
    const encrypted2 = await encrypt(text2);

    // Should be completely different, not just one character different
    expect(encrypted1).not.toBe(encrypted2);

    // Count differing characters - should be many
    let differingChars = 0;
    const minLength = Math.min(encrypted1.length, encrypted2.length);
    for (let i = 0; i < minLength; i++) {
      if (encrypted1[i] !== encrypted2[i]) {
        differingChars++;
      }
    }

    // Most characters should differ (avalanche effect)
    expect(differingChars).toBeGreaterThan(minLength * 0.3);
  });
});

describe('isProbablyEncryptedPayload', () => {
  it('returns true for valid encrypted payload', async () => {
    const encrypted = await encrypt('test data');
    expect(isProbablyEncryptedPayload(encrypted)).toBe(true);
  });

  it('returns true for payload with minimum encrypted bytes', () => {
    const minPayload = btoa(String.fromCharCode(...new Array(MIN_ENCRYPTED_BYTES).fill(0)));
    expect(isProbablyEncryptedPayload(minPayload)).toBe(true);
  });

  it('returns false for too-short base64 string', () => {
    const shortPayload = btoa('abc');
    expect(isProbablyEncryptedPayload(shortPayload)).toBe(false);
  });

  it('returns false for invalid base64', () => {
    expect(isProbablyEncryptedPayload('not-base64!!!')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isProbablyEncryptedPayload('')).toBe(false);
  });

  it('returns false for plaintext', () => {
    expect(isProbablyEncryptedPayload('plain text password')).toBe(false);
  });

  it('returns false for JSON string', () => {
    expect(isProbablyEncryptedPayload('{"key": "value"}')).toBe(false);
  });

  it('returns true for long valid base64', () => {
    const longBase64 = btoa(String.fromCharCode(...new Array(100).fill(65)));
    expect(isProbablyEncryptedPayload(longBase64)).toBe(true);
  });
});

describe('decryptLegacy', () => {
  it('throws error when decrypting invalid data', async () => {
    await expect(decryptLegacy('invalid-data')).rejects.toThrow('Failed to decrypt data');
  });

  it('throws error when decrypting tampered data', async () => {
    const encrypted = await encrypt('test');
    const tampered = encrypted.slice(0, -5) + 'ZZZZZ';
    await expect(decryptLegacy(tampered)).rejects.toThrow('Failed to decrypt data');
  });

  it('throws error for empty string', async () => {
    await expect(decryptLegacy('')).rejects.toThrow();
  });

  it('throws error for non-base64 string', async () => {
    await expect(decryptLegacy('not valid base64!!!')).rejects.toThrow('Failed to decrypt data');
  });
});

describe('Salt generation and persistence', () => {
  let originalLocalStorage: Storage;

  beforeEach(() => {
    originalLocalStorage = window.localStorage;
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  it('generates persistent salt and stores in localStorage', async () => {
    const storageKey = 'zmng_crypto_salt_v1';
    localStorage.removeItem(storageKey);

    const plaintext = 'test';
    await encrypt(plaintext);

    const salt = localStorage.getItem(storageKey);
    expect(salt).toBeTruthy();
    expect(typeof salt).toBe('string');
    expect(salt!.length).toBeGreaterThan(0);
  });

  it('reuses existing salt from localStorage', async () => {
    const storageKey = 'zmng_crypto_salt_v1';
    localStorage.removeItem(storageKey);

    await encrypt('test1');
    const salt1 = localStorage.getItem(storageKey);

    await encrypt('test2');
    const salt2 = localStorage.getItem(storageKey);

    expect(salt1).toBe(salt2);
  });

  it('uses fallback salt when localStorage is unavailable', async () => {
    Object.defineProperty(window, 'localStorage', {
      value: undefined,
      writable: true,
    });

    const plaintext = 'test';
    const encrypted = await encrypt(plaintext);
    expect(encrypted).toBeTruthy();
  });

  it('uses fallback salt when localStorage throws error', async () => {
    const mockStorage = {
      getItem: vi.fn(() => {
        throw new Error('Storage error');
      }),
      setItem: vi.fn(() => {
        throw new Error('Storage error');
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
    });

    const plaintext = 'test';
    const encrypted = await encrypt(plaintext);
    expect(encrypted).toBeTruthy();
  });
});

describe('Key derivation with PBKDF2', () => {
  it('derives consistent key from same salt', async () => {
    const storageKey = 'zmng_crypto_salt_v1';
    localStorage.removeItem(storageKey);

    const plaintext = 'test data';
    const encrypted1 = await encrypt(plaintext);
    const salt = localStorage.getItem(storageKey);

    const decrypted1 = await decrypt(encrypted1);
    expect(decrypted1).toBe(plaintext);

    const encrypted2 = await encrypt(plaintext);
    const decrypted2 = await decrypt(encrypted2);
    expect(decrypted2).toBe(plaintext);

    expect(localStorage.getItem(storageKey)).toBe(salt);
  });

  it('successfully encrypts and decrypts with PBKDF2-derived key', async () => {
    const plaintext = 'sensitive password';
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });
});

describe('Error handling', () => {
  it('throws error with helpful message on encryption failure', async () => {
    vi.spyOn(window.crypto.subtle, 'encrypt').mockRejectedValueOnce(new Error('Crypto error'));

    await expect(encrypt('test')).rejects.toThrow('Failed to encrypt data');

    vi.restoreAllMocks();
  });

  it('throws error with helpful message on decryption failure', async () => {
    await expect(decrypt('invalid!!!data')).rejects.toThrow('Failed to decrypt data');
  });

  it('handles corrupted IV data', async () => {
    const validEncrypted = await encrypt('test');
    const corrupted = validEncrypted.substring(0, 10);

    await expect(decrypt(corrupted)).rejects.toThrow('Failed to decrypt data');
  });

  it('handles corrupted ciphertext data', async () => {
    const validEncrypted = await encrypt('test');
    const base64Decoded = atob(validEncrypted);
    const corrupted = btoa(base64Decoded.slice(0, -5) + 'XXXXX');

    await expect(decrypt(corrupted)).rejects.toThrow('Failed to decrypt data');
  });
});
