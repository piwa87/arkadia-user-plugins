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

// `c<n>` and `z<n>` look alike but target different things on purpose:
// c<n> goes through the client's built-in `/z` enemy numbering, z<n> through the
// `set`-configured target slots. Reversing that has been a regression before.
describe('c / z attack aliases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', makeLocalStorageMock());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Dispatch like the client: first registered alias whose pattern matches wins.
  type Aliases = ReturnType<typeof createMockApi>['aliases'];
  const fire = (aliases: Aliases, input: string) => {
    const alias = aliases.find((a) => a.pattern.test(input));
    expect(alias, `no alias matched "${input}"`).toBeDefined();
    alias!.callback(input.match(alias!.pattern) as RegExpMatchArray);
  };

  it('c<n> attacks by the client enemy number, for any n', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    for (const n of ['1', '3', '12']) {
      fire(aliases, `c${n}`);
      expect(api.command.send).toHaveBeenCalledWith(`/z ${n}`);
    }
  });

  it('z<n> attacks the configured set slot, not the client number', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    fire(aliases, 'set orka');
    // z1..z4 re-enter the `z <n>` alias, which resolves the slot.
    fire(aliases, 'z2');
    expect(api.command.send).toHaveBeenCalledWith('z 2');
    fire(aliases, 'z 2');
    expect(api.command.send).toHaveBeenCalledWith('zabij 2. orka');
  });

  it('c with no argument attacks slot 1, c <text> kills by name', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    fire(aliases, 'set orka');
    fire(aliases, 'c');
    expect(api.command.send).toHaveBeenCalledWith('zabij orka');
    fire(aliases, 'c kota');
    expect(api.command.send).toHaveBeenCalledWith('zabij kota');
  });

  it('no longer registers the cc aliases', async () => {
    const { api, aliases } = createMockApi();
    await init(api);

    expect(aliases.find((a) => a.pattern.test('cc'))).toBeUndefined();
    expect(aliases.find((a) => a.pattern.test('cc kota'))).toBeUndefined();
  });
});
