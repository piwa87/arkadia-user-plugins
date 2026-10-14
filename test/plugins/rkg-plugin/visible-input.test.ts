import { afterEach, describe, expect, it, vi } from 'vitest';
import { showClubInput } from '../../../src/plugins/rkg-plugin/visible-input';

afterEach(() => vi.unstubAllGlobals());

describe('club dialogue input', () => {
  it('shows club answers as text and restores the password field afterward', () => {
    class FakeInput {
      type = 'password';
      autocomplete = 'current-password';
    }
    const input = new FakeInput();
    vi.stubGlobal('HTMLInputElement', FakeInput);
    vi.stubGlobal('document', { getElementById: (id: string) =>
      id === 'message-input-password' ? input : null });
    vi.stubGlobal('MutationObserver', undefined);

    const restore = showClubInput();
    expect(input.type).toBe('text');
    expect(input.autocomplete).toBe('off');
    restore();
    expect(input.type).toBe('password');
    expect(input.autocomplete).toBe('current-password');
  });
});
