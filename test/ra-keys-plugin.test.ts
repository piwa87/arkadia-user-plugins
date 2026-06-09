import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockApi } from './helpers/mockApi';
import { init, destroy } from '../src/plugins/ra-keys-plugin';

const SAMPLE_KEYS = JSON.stringify([
  { id: '1', name: 'mosiezny wielki klucz (Baron w Bretonii)', description: 'Baron w Bretonii', domain: 'Imperium', comment: '', treasury: null },
  { id: '2', name: 'duzy ciezki klucz (Seth w Wissenlandzie)', description: 'Seth w Wissenlandzie', domain: 'Imperium', comment: '', treasury: null },
  { id: '3', name: 'biala bretonska tunika (Tunika Darrepina)', description: '', domain: 'Imperium', comment: '', treasury: null },
]);

function createLineWithInsert(text: string) {
  let current = text;
  const insertions: Array<{ at: number; label: string; color: unknown }> = [];
  const line: any = {
    get text() { return current; },
    insert: vi.fn((at: number, label: string, color: unknown) => {
      insertions.push({ at, label, color });
      current = current.slice(0, at) + label + current.slice(at);
      return line;
    }),
    _insertions: insertions,
  };
  return line;
}

describe('ra-keys-plugin', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageMock[key] ?? null,
      setItem: (key: string, value: string) => { localStorageMock[key] = value; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers a trigger and alias when keys are present', async () => {
    localStorageMock['ra:keys'] = SAMPLE_KEYS;
    const { api, triggers, aliases } = createMockApi();

    await init(api as any);

    expect(triggers).toHaveLength(1);
    expect(aliases).toHaveLength(1);
  });

  it('registers nothing when localStorage is empty', async () => {
    const { api, triggers, aliases } = createMockApi();

    await init(api as any);

    expect(triggers).toHaveLength(0);
    expect(aliases).toHaveLength(0);
  });

  it('inserts description after a matched key name', async () => {
    localStorageMock['ra:keys'] = SAMPLE_KEYS;
    const { api, triggers } = createMockApi();

    await init(api as any);

    const trigger = triggers[0];
    const line = createLineWithInsert('Znalazles mosiezny wielki klucz lezacy na ziemi.');
    trigger.callback(line, [] as any);

    expect(line._insertions).toHaveLength(1);
    expect(line._insertions[0].label).toBe(' (Baron w Bretonii)');
  });

  it('falls back to parenthetical when description field is empty', async () => {
    localStorageMock['ra:keys'] = SAMPLE_KEYS;
    const { api, triggers } = createMockApi();

    await init(api as any);

    const trigger = triggers[0];
    const line = createLineWithInsert('Widzisz biala bretonska tunika.');
    trigger.callback(line, [] as any);

    expect(line._insertions).toHaveLength(1);
    expect(line._insertions[0].label).toBe(' (Tunika Darrepina)');
  });

  it('inserts multiple annotations right-to-left on a line with two keys', async () => {
    localStorageMock['ra:keys'] = SAMPLE_KEYS;
    const { api, triggers } = createMockApi();

    await init(api as any);

    const trigger = triggers[0];
    const line = createLineWithInsert('mosiezny wielki klucz i duzy ciezki klucz');
    trigger.callback(line, [] as any);

    // Two insertions, processed right-to-left → second key annotated first
    expect(line._insertions).toHaveLength(2);
    expect(line._insertions[0].label).toBe(' (Seth w Wissenlandzie)');
    expect(line._insertions[1].label).toBe(' (Baron w Bretonii)');
  });

  it('rakeys! alias sends 4 fake lines', async () => {
    localStorageMock['ra:keys'] = SAMPLE_KEYS;
    const { api, aliases } = createMockApi();

    await init(api as any);

    const alias = aliases[0];
    alias.callback(undefined);

    // Only 3 keys in sample — sends all 3 (min of 4 and available count)
    expect((api.command.send as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(3);
    const calls = (api.command.send as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.every((args: unknown[]) => (args[0] as string).startsWith('/fake '))).toBe(true);
  });

  it('destroy removes trigger tag and alias', async () => {
    localStorageMock['ra:keys'] = SAMPLE_KEYS;
    const { api } = createMockApi();

    await init(api as any);
    await destroy();

    expect(api.triggers.removeByTag).toHaveBeenCalledWith('raKeysPlugin');
    expect(api.aliases.remove).toHaveBeenCalledWith('alias-1');
  });
});
