import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockApi, runLine } from '../../helpers/mockApi';
import { createTmpkState, setupTmpk } from '../../../src/plugins/core-plugin/tmpk/tmpk';
import { storage } from '../../../src/lib/storage';

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
});

describe('createTmpkState', () => {
  it('uses default list when nothing is stored', () => {
    const state = createTmpkState();
    expect(state.list).toContain('troll');
    expect(state.list).toContain('szkielet');
    expect(state.list.length).toBeGreaterThan(0);
  });

  it('loads persisted list from localStorage', () => {
    storage.set('tmpk', ['wilk', 'niedz']);
    const state = createTmpkState();
    expect(state.list).toEqual(['wilk', 'niedz']);
  });
});

describe('setupTmpk', () => {
  it('registers a token trigger per list entry on init', () => {
    const mock = createMockApi();
    setupTmpk(mock.api);
    const tmpkTokens = mock.tokenTriggers.filter((t) => t.tag === 'tmpk');
    expect(tmpkTokens.length).toBeGreaterThan(0);
    expect(tmpkTokens.some((t) => t.token === 'troll')).toBe(true);
    expect(mock.triggers.filter((t) => t.tag === 'tmpk')).toHaveLength(0);
  });

  it('colors whole-word matches via line.color', () => {
    const mock = createMockApi();
    setupTmpk(mock.api);
    // "troll" at index 14-19 is a standalone word → should be colored
    const line = runLine(mock, 'Widzisz tutaj troll.');
    expect(line!.color).toHaveBeenCalledWith([14, 19], expect.anything());
    // "ork" inside "pagorkow" must not be colored ("czarny ork" is listed)
    const line2 = runLine(mock, 'Posrod pagorkow.');
    expect(line2!.color).not.toHaveBeenCalled();
    // multi-word name fires and colors the full phrase
    const line3 = runLine(mock, 'Czarny ork sapie.');
    expect(line3!.color).toHaveBeenCalledWith([0, 10], expect.anything());
  });

  it('tmpk+ adds item to list and persists it', () => {
    const { api, aliases } = createMockApi();
    setupTmpk(api);
    const addAlias = aliases.find((a) => a.pattern.test('tmpk+ wilk'))!;
    addAlias.callback(['tmpk+ wilk', 'wilk'] as unknown as RegExpMatchArray);
    expect(storage.get<string[]>('tmpk')).toContain('wilk');
    expect(api.output.print).toHaveBeenCalledWith(expect.stringContaining('wilk'));
  });

  it('tmpk+ does not add duplicates', () => {
    const { api, aliases } = createMockApi();
    setupTmpk(api);
    const addAlias = aliases.find((a) => a.pattern.test('tmpk+ troll'))!;
    // 'troll' is in the default list — adding it again should print "juz jest" and not persist
    addAlias.callback(['tmpk+ troll', 'troll'] as unknown as RegExpMatchArray);
    expect(api.output.print).toHaveBeenCalledWith(expect.stringContaining('juz jest'));
    expect(storage.get<string[]>('tmpk')).toBeNull();
  });

  it('tmpk- removes named item and persists', () => {
    const { api, aliases } = createMockApi();
    setupTmpk(api);
    const removeAlias = aliases.find((a) => a.pattern.test('tmpk- troll'))!;
    removeAlias.callback(['tmpk- troll', 'troll'] as unknown as RegExpMatchArray);
    expect(storage.get<string[]>('tmpk')).not.toContain('troll');
  });

  it('tmpk- removes last item when no arg given', () => {
    storage.set('tmpk', ['wilk', 'niedz']);
    const { api, aliases } = createMockApi();
    setupTmpk(api);
    const removeAlias = aliases.find((a) => a.pattern.test('tmpk-'))!;
    removeAlias.callback(['tmpk-', undefined] as unknown as RegExpMatchArray);
    const stored = storage.get<string[]>('tmpk')!;
    expect(stored).not.toContain('niedz');
    expect(stored).toContain('wilk');
  });

  it('tmpk-- clears list and persists', () => {
    const { api, aliases } = createMockApi();
    setupTmpk(api);
    const clearAlias = aliases.find((a) => a.pattern.test('tmpk--'))!;
    clearAlias.callback(['tmpk--'] as unknown as RegExpMatchArray);
    expect(storage.get<string[]>('tmpk')).toEqual([]);
    expect(api.output.print).toHaveBeenCalledWith(expect.stringContaining('wyzerowana'));
  });

  it('tmpk+ re-registers token triggers including the new item', () => {
    const mock = createMockApi();
    setupTmpk(mock.api);
    const addAlias = mock.aliases.find((a) => a.pattern.test('tmpk+ wilk'))!;
    addAlias.callback(['tmpk+ wilk', 'wilk'] as unknown as RegExpMatchArray);
    const tmpkTokens = mock.tokenTriggers.filter((t) => t.tag === 'tmpk');
    expect(tmpkTokens.some((t) => t.token === 'wilk')).toBe(true);
  });

  it('tmpk-- removes all tmpk token triggers', () => {
    const mock = createMockApi();
    setupTmpk(mock.api);
    const clearAlias = mock.aliases.find((a) => a.pattern.test('tmpk--'))!;
    clearAlias.callback(['tmpk--'] as unknown as RegExpMatchArray);
    expect(mock.tokenTriggers.filter((t) => t.tag === 'tmpk')).toHaveLength(0);
  });
});
