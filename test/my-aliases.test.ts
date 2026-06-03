import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { init } from '../src/plugins/core-plugin/index';
import { createMockApi } from './helpers/mockApi';

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}

describe('core-plugin aliases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', makeLocalStorageMock());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a footer component showing all 4 default targets on init', async () => {
    const { api, footerComponents } = createMockApi();
    await init(api);

    const targets = footerComponents.find((c) => c.id === 'targets');
    expect(targets).toBeDefined();
    expect(targets!.initialContent).toContain('CEL');
    expect(targets!.initialContent).toContain('INIT');
  });

  it('updates the footer when set alias changes all targets', async () => {
    const { api, aliases, footerComponents } = createMockApi();
    await init(api);

    const setAlias = aliases.find((a) => a.pattern.test('set goblin'));
    setAlias!.callback(['set goblin', 'goblin'] as unknown as RegExpMatchArray);

    const { setContent } = footerComponents[0].handle;
    expect(setContent).toHaveBeenCalledTimes(1);
    const content = (setContent as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(content).toContain('goblin');
  });

  it('updates the footer when set1–set4 aliases change individual targets', async () => {
    const { api, aliases, footerComponents } = createMockApi();
    await init(api);

    for (let n = 1; n <= 4; n++) {
      const setNAlias = aliases.find((a) => a.pattern.test(`set${n} dragon`));
      expect(setNAlias).toBeDefined();
      setNAlias!.callback([`set${n} dragon`, 'dragon'] as unknown as RegExpMatchArray);
    }

    const { setContent } = footerComponents[0].handle;
    expect(setContent).toHaveBeenCalledTimes(4);
    const lastContent = (setContent as ReturnType<typeof vi.fn>).mock.calls[3][0] as string;
    expect(lastContent).toContain('dragon');
  });
});
