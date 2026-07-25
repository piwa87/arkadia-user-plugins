import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupHof } from '../../../src/plugins/rkg-plugin/hof';
import { utworzBaze } from '../../../src/plugins/rkg-plugin/store';
import { createMockApi } from '../../helpers/mockApi';
import { storage } from '../../../src/lib/storage';

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  };
}

type Mock = ReturnType<typeof createMockApi>;

function setup() {
  const mock = createMockApi();
  const baza = utworzBaze();
  const cleanup = setupHof(mock.api, baza);
  return { mock, baza, cleanup };
}

function odpal(mock: Mock, wejscie: string): boolean {
  const alias = mock.aliases.find((a) => a.pattern.test(wejscie));
  expect(alias, `brak aliasu: ${wejscie}`).toBeDefined();
  return alias!.callback(wejscie.match(alias!.pattern) as RegExpMatchArray) as boolean;
}

function printed(mock: Mock): string[] {
  return (mock.api.output.print as any).mock.calls.map(([a]: [unknown]) => String(a));
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
});

describe('setupHof registration', () => {
  it('adds a popup menu entry and does not throw', () => {
    const { mock, cleanup } = setup();
    expect(mock.api.ui.addPopupMenuEntry).toHaveBeenCalled();
    expect(() => cleanup()).not.toThrow();
  });

  it('rkghof opens the popup without needing a DOM', async () => {
    const { mock, cleanup } = setup();
    expect(odpal(mock, 'rkghof')).toBe(true);
    // registerPersistentPopup is async and fire-and-forget; let it settle.
    await Promise.resolve();
    expect(mock.api.ui.registerPersistentPopup).toHaveBeenCalled();
    cleanup();
  });
});

describe('rkgnick', () => {
  it('reports anonymous when unset', () => {
    const { mock } = setup();
    odpal(mock, 'rkgnick');
    expect(printed(mock).join('\n')).toContain('anonim');
  });

  it('sets a valid nick and persists it', () => {
    const { mock } = setup();
    odpal(mock, 'rkgnick Piot');
    expect(storage.get('rkg:nick')).toBe('Piot');
    expect(printed(mock).join('\n')).toContain('Piot');
  });

  it('rejects an invalid nick', () => {
    const { mock } = setup();
    odpal(mock, 'rkgnick !!');
    expect(storage.get('rkg:nick')).toBeNull();
  });

  it('clears the nick and revokes consent with "-"', () => {
    const { mock } = setup();
    storage.set('rkg:nick', 'Piot');
    storage.set('rkg:zgoda', true);
    odpal(mock, 'rkgnick -');
    expect(storage.get('rkg:nick')).toBeNull();
    expect(storage.get('rkg:zgoda')).toBe(false);
  });
});

describe('rkgwall', () => {
  it('shows the default wall URL when unset', () => {
    const { mock } = setup();
    odpal(mock, 'rkgwall');
    expect(printed(mock).join('\n')).toContain('workers.dev');
  });

  it('stores a full URL and strips a trailing slash', () => {
    const { mock } = setup();
    odpal(mock, 'rkgwall https://rkg.example.com/');
    expect(storage.get('rkg:wall')).toBe('https://rkg.example.com');
  });

  it('rejects a non-URL', () => {
    const { mock } = setup();
    odpal(mock, 'rkgwall nonsense');
    expect(storage.get('rkg:wall')).toBeNull();
  });
});
