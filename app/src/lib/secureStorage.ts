/**
 * Secure Storage utility
 * - Uses @aparajita/capacitor-secure-storage on mobile (iOS Keychain / Android Keystore)
 * - Uses AES-GCM encryption in localStorage on web/desktop
 *
 * Mobile Security:
 *   - iOS: Data stored in iOS Keychain (hardware-encrypted)
 *   - Android: Data encrypted with AES-256-GCM using Android Keystore
 *
 * Web/Desktop Security:
 *   - Browser: AES-GCM encryption with PBKDF2 key derivation (100k iterations)
 *   - Electron: Same as browser (no OS-level keychain support in aparajita plugin)
 */

import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { encrypt, decrypt, isCryptoAvailable } from './crypto';
import { log } from './logger';

const STORAGE_PREFIX = 'zmng_secure_';

/**
 * Check if we're running on a native platform (iOS/Android)
 */
function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Store a value securely
 * - On mobile: Uses iOS Keychain or Android Keystore (hardware-encrypted)
 * - On web/desktop: Uses AES-GCM encryption in localStorage
 */
export async function setSecureValue(key: string, value: string): Promise<void> {
  const fullKey = `${STORAGE_PREFIX}${key}`;

  if (isNativePlatform()) {
    // Use SecureStorage plugin (iOS Keychain / Android Keystore)
    log.debug('Storing in native secure storage (Keychain/Keystore)', {
      component: 'SecureStorage',
      key,
      platform: Capacitor.getPlatform(),
    });
    await SecureStorage.set(fullKey, value);
  } else {
    // Use AES-GCM encryption for web/desktop
    if (!isCryptoAvailable()) {
      log.warn('Web Crypto API not available, storing unencrypted', {
        component: 'SecureStorage',
        key,
      });
      localStorage.setItem(fullKey, value);
      return;
    }

    try {
      const encrypted = await encrypt(value);
      localStorage.setItem(fullKey, encrypted);
      log.debug('Value encrypted and stored in localStorage', {
        component: 'SecureStorage',
        key,
      });
    } catch (error) {
      log.error('Failed to encrypt value', { component: 'SecureStorage', key }, error);
      throw new Error('Failed to securely store value');
    }
  }
}

/**
 * Retrieve a value securely
 * - On mobile: Retrieves from iOS Keychain or Android Keystore
 * - On web/desktop: Decrypts from localStorage
 */
export async function getSecureValue(key: string): Promise<string | null> {
  const fullKey = `${STORAGE_PREFIX}${key}`;

  if (isNativePlatform()) {
    // Retrieve from SecureStorage (Keychain/Keystore)
    log.debug('Retrieving from native secure storage', {
      component: 'SecureStorage',
      key,
      platform: Capacitor.getPlatform(),
    });
    try {
      const value = await SecureStorage.get(fullKey);
      // We only store strings, so cast DataType to string
      return value as string | null;
    } catch (error) {
      // Key doesn't exist or error occurred
      log.debug('Key not found in native secure storage', {
        component: 'SecureStorage',
        key,
      });
      return null;
    }
  } else {
    // Retrieve and decrypt from localStorage
    const encrypted = localStorage.getItem(fullKey);
    if (!encrypted) {
      return null;
    }

    if (!isCryptoAvailable()) {
      log.warn('Web Crypto API not available, returning unencrypted value', {
        component: 'SecureStorage',
        key,
      });
      return encrypted;
    }

    try {
      const decrypted = await decrypt(encrypted);
      log.debug('Value retrieved and decrypted from localStorage', {
        component: 'SecureStorage',
        key,
      });
      return decrypted;
    } catch (error) {
      log.error('Failed to decrypt value', { component: 'SecureStorage', key }, error);
      // Return encrypted value as fallback (may be unencrypted legacy data)
      return encrypted;
    }
  }
}

/**
 * Remove a value from secure storage
 */
export async function removeSecureValue(key: string): Promise<void> {
  const fullKey = `${STORAGE_PREFIX}${key}`;

  if (isNativePlatform()) {
    log.debug('Removing from native secure storage', {
      component: 'SecureStorage',
      key,
      platform: Capacitor.getPlatform(),
    });
    try {
      await SecureStorage.remove(fullKey);
    } catch (error) {
      // Key might not exist, which is fine
      log.debug('Key not found during removal (already deleted?)', {
        component: 'SecureStorage',
        key,
      });
    }
  } else {
    log.debug('Removing from localStorage', { component: 'SecureStorage', key });
    localStorage.removeItem(fullKey);
  }
}

/**
 * Check if a value exists in secure storage
 */
export async function hasSecureValue(key: string): Promise<boolean> {
  const fullKey = `${STORAGE_PREFIX}${key}`;

  if (isNativePlatform()) {
    try {
      const value = await SecureStorage.get(fullKey);
      return value !== null && value !== undefined;
    } catch (error) {
      return false;
    }
  } else {
    return localStorage.getItem(fullKey) !== null;
  }
}

/**
 * Clear all secure values (useful for logout/reset)
 */
export async function clearSecureStorage(): Promise<void> {
  if (isNativePlatform()) {
    log.debug('Clearing all secure storage (native)', {
      component: 'SecureStorage',
      platform: Capacitor.getPlatform(),
    });
    try {
      // SecureStorage.clear() removes ALL keys, not just ours with prefix
      // So we use keys() to get all keys and filter for our prefix
      const allKeys = await SecureStorage.keys();
      const ourKeys = allKeys.filter((key) => key.startsWith(STORAGE_PREFIX));

      for (const key of ourKeys) {
        try {
          await SecureStorage.remove(key);
        } catch (error) {
          log.warn('Failed to remove key during clear', {
            component: 'SecureStorage',
            key,
          });
        }
      }

      log.debug('Native secure storage cleared', {
        component: 'SecureStorage',
        keysRemoved: ourKeys.length,
      });
    } catch (error) {
      log.error('Failed to clear native secure storage', {
        component: 'SecureStorage',
      }, error);
    }
  } else {
    log.debug('Clearing all secure storage (web)', { component: 'SecureStorage' });
    // Remove all keys starting with our prefix
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}

/**
 * Get storage type info (for debugging)
 */
export function getStorageInfo(): {
  platform: 'native' | 'web';
  method: string;
  details: string;
} {
  const platformName = Capacitor.getPlatform();

  if (isNativePlatform()) {
    const details =
      platformName === 'ios'
        ? 'iOS Keychain (hardware-encrypted)'
        : 'Android Keystore with AES-256-GCM';

    return {
      platform: 'native',
      method: '@aparajita/capacitor-secure-storage',
      details,
    };
  } else {
    return {
      platform: 'web',
      method: isCryptoAvailable()
        ? 'AES-GCM encryption (Web Crypto API)'
        : 'Unencrypted localStorage (fallback)',
      details: isCryptoAvailable()
        ? 'PBKDF2 key derivation with 100k iterations'
        : 'WARNING: No encryption available',
    };
  }
}
