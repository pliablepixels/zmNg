import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfileStore } from '../profile';
import { createApiClient, setApiClient } from '../../api/client';
import { getServerTimeZone } from '../../api/time';
import { setSecureValue, removeSecureValue } from '../../lib/secureStorage';

vi.mock('../../api/client', () => ({
  createApiClient: vi.fn(() => ({ mock: true })),
  setApiClient: vi.fn(),
}));

vi.mock('../../api/time', () => ({
  getServerTimeZone: vi.fn(),
}));

vi.mock('../../lib/secureStorage', () => ({
  setSecureValue: vi.fn().mockResolvedValue(undefined),
  getSecureValue: vi.fn().mockResolvedValue(undefined),
  removeSecureValue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../lib/logger', () => ({
  log: {
    profile: vi.fn(),
    profileService: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4,
  },
}));

describe('Profile Store', () => {
  beforeEach(() => {
    useProfileStore.setState({
      profiles: [],
      currentProfileId: null,
      isInitialized: true,
    });
    vi.clearAllMocks();
    vi.stubGlobal('crypto', { randomUUID: () => 'profile-1' });
  });

  it('detects duplicate profile names', () => {
    useProfileStore.setState({
      profiles: [
        {
          id: 'p1',
          name: 'Home',
          apiUrl: 'http://a',
          portalUrl: 'http://a',
          cgiUrl: 'http://a/cgi-bin',
          isDefault: true,
          createdAt: 1,
        },
      ],
    });

    const exists = useProfileStore.getState().profileExists('home');

    expect(exists).toBe(true);
  });

  it('adds a profile and stores password securely', async () => {
    vi.mocked(getServerTimeZone).mockResolvedValue('UTC');

    const id = await useProfileStore.getState().addProfile({
      name: 'Office',
      portalUrl: 'https://example.test',
      apiUrl: 'https://example.test',
      cgiUrl: 'https://example.test/cgi-bin',
      isDefault: false,
      username: 'admin',
      password: 'secret',
    });

    expect(id).toBe('profile-1');
    expect(setSecureValue).toHaveBeenCalledWith('password_profile-1', 'secret');
    expect(createApiClient).toHaveBeenCalledWith('https://example.test');
    expect(setApiClient).toHaveBeenCalled();

    const { profiles, currentProfileId } = useProfileStore.getState();
    const profile = profiles.find(p => p.id === currentProfileId);
    expect(profile?.name).toBe('Office');
    expect(profile?.password).toBe('stored-securely');
  });

  it('rejects duplicate profile names on add', async () => {
    useProfileStore.setState({
      profiles: [
        {
          id: 'p1',
          name: 'Home',
          apiUrl: 'http://a',
          portalUrl: 'http://a',
          cgiUrl: 'http://a/cgi-bin',
          isDefault: true,
          createdAt: 1,
        },
      ],
    });

    await expect(
      useProfileStore.getState().addProfile({
        name: 'Home',
        portalUrl: 'https://example.test',
        apiUrl: 'https://example.test',
        cgiUrl: 'https://example.test/cgi-bin',
        isDefault: false,
      })
    ).rejects.toThrow('already exists');
  });

  it('updates profile and enforces unique names', async () => {
    useProfileStore.setState({
      profiles: [
        {
          id: 'p1',
          name: 'Home',
          apiUrl: 'http://a',
          portalUrl: 'http://a',
          cgiUrl: 'http://a/cgi-bin',
          isDefault: true,
          createdAt: 1,
        },
        {
          id: 'p2',
          name: 'Office',
          apiUrl: 'http://b',
          portalUrl: 'http://b',
          cgiUrl: 'http://b/cgi-bin',
          isDefault: false,
          createdAt: 2,
        },
      ],
    });

    await expect(
      useProfileStore.getState().updateProfile('p2', { name: 'Home' })
    ).rejects.toThrow('already exists');
  });

  it('removes profile password on delete', async () => {
    useProfileStore.setState({
      profiles: [
        {
          id: 'p1',
          name: 'Home',
          apiUrl: 'http://a',
          portalUrl: 'http://a',
          cgiUrl: 'http://a/cgi-bin',
          isDefault: true,
          createdAt: 1,
        },
      ],
      currentProfileId: 'p1',
    });

    await useProfileStore.getState().deleteProfile('p1');

    expect(removeSecureValue).toHaveBeenCalledWith('password_p1');
    expect(useProfileStore.getState().profiles).toHaveLength(0);
  });
});
