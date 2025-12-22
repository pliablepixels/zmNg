import type { Profile } from '../api/types';
import { setSecureValue, getSecureValue, removeSecureValue } from '../lib/secureStorage';
import { log } from '../lib/logger';
import { isProfileNameAvailable } from '../lib/profile-validation';

export const ProfileService = {
    /**
     * Securely save a profile's password.
     */
    async savePassword(profileId: string, password: string): Promise<void> {
        try {
            await setSecureValue(`password_${profileId}`, password);
            log.profile('Password stored securely', { profileId });
        } catch (error) {
            log.error('Failed to store password securely', { component: 'ProfileService' }, error);
            throw new Error('Failed to securely store password');
        }
    },

    /**
     * Retrieve a profile's password from secure storage.
     */
    async getPassword(profileId: string): Promise<string | undefined> {
        try {
            const password = await getSecureValue(`password_${profileId}`);
            return password || undefined;
        } catch (error) {
            log.error('Failed to retrieve password from secure storage', { component: 'ProfileService' }, error);
            return undefined;
        }
    },

    /**
     * Remove a profile's password from secure storage.
     */
    async deletePassword(profileId: string): Promise<void> {
        try {
            await removeSecureValue(`password_${profileId}`);
            log.profile('Password removed from secure storage', { profileId });
        } catch (error) {
            log.warn('Failed to remove password from secure storage', { component: 'ProfileService' }, error);
        }
    },

    /**
     * Check if a profile name already exists
     * @deprecated Use isProfileNameAvailable from lib/profile-validation instead
     */
    validateNameAvailability(name: string, profiles: Profile[], excludeId?: string): boolean {
        return isProfileNameAvailable(name, profiles, excludeId);
    }
};
