import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminKey, forgetAdminKey, rememberAdminKey } from '../../web/src/local-state';

describe('moderation session', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
  });

  it('forgets the moderator key on logout', () => {
    rememberAdminKey('test-key');
    expect(adminKey()).toBe('test-key');

    forgetAdminKey();

    expect(adminKey()).toBe('');
  });
});
