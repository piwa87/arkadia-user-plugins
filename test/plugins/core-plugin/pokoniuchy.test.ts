import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storage } from '../../../src/lib/storage';
import {
  POK_SHORTS,
  POK_STORAGE_KEY,
  createPokState,
  setupPok,
  type PokFinding,
} from '../../../src/plugins/core-plugin/pokoniuchy';
import { createMockApi, MockAnsiAwareBuffer, runLine } from '../../helpers/mockApi';

function makeLocalStorageMock() {
  const data: Record<string, string> = {};
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => { data[key] = value; },
    removeItem: (key: string) => { delete data[key]; },
    clear: () => { for (const key in data) delete data[key]; },
  };
}

function runAlias(
  aliases: ReturnType<typeof createMockApi>['aliases'],
  command: string,
): void {
  const alias = aliases.find((entry) => entry.pattern.test(command));
  expect(alias, `missing alias for ${command}`).toBeDefined();
  alias!.callback(command.match(alias!.pattern) as RegExpMatchArray);
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('pokoniuchy', () => {
  it('keeps creature shorts in alphabetical order', () => {
    expect([...POK_SHORTS]).toEqual([...POK_SHORTS].sort());
  });

  it('registers only token-gated creature triggers', () => {
    const mock = createMockApi();
    setupPok(mock.api);

    expect(mock.triggers.filter((trigger) => trigger.tag === 'pokoniuchy')).toHaveLength(0);
    expect(mock.tokenTriggers.some((trigger) => trigger.tag === 'pokoniuchy' && trigger.token === 'wiwerna')).toBe(true);
  });

  it('does not save findings until searching is enabled', () => {
    const mock = createMockApi({ room: { id: 10276, area: 7 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 7, areaName: 'Poludniowe Kaedwen', rooms: [] }]) as any;
    setupPok(mock.api);

    runLine(mock, 'Galezowaty pokoniunkcyjny klabart stoi tutaj.');

    expect(storage.get(POK_STORAGE_KEY)).toBeNull();
  });

  it('saves a creature with room and area, then ignores a duplicate in the same room', () => {
    const mock = createMockApi({ room: { id: 10276, area: 7 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 7, areaName: 'Poludniowe Kaedwen', rooms: [] }]) as any;
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko+');

    runLine(mock, 'Galezowaty pokoniunkcyjny klabart stoi tutaj.');
    runLine(mock, 'Galezowaty pokoniunkcyjny klabart rozglada sie.');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)).toEqual([{
      roomId: 10276,
      short: 'Galezowaty pokoniunkcyjny klabart',
      areaId: 7,
      areaName: 'Poludniowe Kaedwen',
    }]);
  });

  it('recognizes Omszala jadowita kergulena with trailing punctuation', () => {
    const mock = createMockApi({ room: { id: 12345, area: 8 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 8, areaName: 'Testowy obszar', rooms: [] }]) as any;
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko+');

    runLine(mock, 'Omszala jadowita kergulena.');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)).toContainEqual({
      roomId: 12345,
      short: 'Omszala jadowita kergulena',
      areaId: 8,
      areaName: 'Testowy obszar',
    });
  });

  it('recognizes Drapiezny wezowaty wipper with trailing punctuation', () => {
    const mock = createMockApi({ room: { id: 12346, area: 8 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 8, areaName: 'Testowy obszar', rooms: [] }]) as any;
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko+');

    runLine(mock, 'Drapiezny wezowaty wipper.');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)).toContainEqual({
      roomId: 12346,
      short: 'Drapiezny wezowaty wipper',
      areaId: 8,
      areaName: 'Testowy obszar',
    });
  });

  it('recognizes Rdzawofutra masywna mantikora with trailing punctuation', () => {
    const mock = createMockApi({ room: { id: 12347, area: 10 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 10, areaName: 'Puszcza', rooms: [] }]) as any;
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko+');

    runLine(mock, 'Rdzawofutra masywna mantikora.');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)).toContainEqual({
      roomId: 12347,
      short: 'Rdzawofutra masywna mantikora',
      areaId: 10,
      areaName: 'Puszcza',
    });
  });

  it('loads persisted findings in a fresh state', () => {
    const findings: PokFinding[] = [{
      roomId: 21171,
      short: 'Duza drapiezna endriaga',
      areaId: 9,
      areaName: 'Wschodni Mahakam',
    }];
    storage.set(POK_STORAGE_KEY, findings);

    expect(createPokState().findings).toEqual(findings);
    expect(createPokState().active).toBe(false);
  });

  it('migrates findings saved under the old mod_pok storage key', () => {
    const findings: PokFinding[] = [{
      roomId: 21171,
      short: 'Duza drapiezna endriaga',
      areaId: 9,
      areaName: 'Wschodni Mahakam',
    }];
    storage.set('mod_pok:findings', findings);

    expect(createPokState().findings).toEqual(findings);
    expect(storage.get(POK_STORAGE_KEY)).toEqual(findings);
    expect(storage.get('mod_pok:findings')).toBeNull();
  });

  it('corrects the old wildogon spelling in saved findings', () => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 22468,
      short: 'Szybki agresywny wildogon',
      areaId: 9,
      areaName: 'Wschodni Mahakam',
    }]);

    expect(createPokState().findings[0].short).toBe('Szybki agresywny widlogon');
    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)?.[0].short).toBe('Szybki agresywny widlogon');
  });

  it('prints live distances and makes each room ID run /prowadz', () => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 10276,
      short: 'Galezowaty pokoniunkcyjny klabart',
      areaId: 7,
      areaName: 'Poludniowe Kaedwen',
    }]);
    const mock = createMockApi({ room: { id: 10000, area: 7 } });
    mock.api.map.findPath = vi.fn(() => [10000, 10001, 10276]);
    setupPok(mock.api);

    runAlias(mock.aliases, 'poko_lista');

    const rows = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([value]) => value)
      .filter((value): value is MockAnsiAwareBuffer => value instanceof MockAnsiAwareBuffer);
    const findingRow = rows.find((row) => row.text.includes('Galezowaty'))!;
    expect(findingRow.text).toMatch(/^\| 10276 \| 2 lok\. \|/);
    const idSegment = findingRow.segments.find((segment) => segment.text === '10276')!;
    expect(idSegment.state).toMatchObject({
      value: '#2f855a',
      underline: true,
      hyperlink: expect.any(Object),
    });
    const afterId = findingRow.segments.slice(findingRow.segments.indexOf(idSegment) + 1);
    expect(afterId.filter((segment) => segment.state?.hyperlink).map((segment) => segment.text)).toEqual([
      '2 lok.', '[ ]', '👁', '🗑',
    ]);
    expect(afterId[0].state).toMatchObject({ value: '#929292' });
    expect(rows.some((row) => /\b(?:NR|LOC|DIS|SHORT)\b/.test(row.text))).toBe(false);
    findingRow.klik('10276');
    expect(mock.api.command.send).toHaveBeenCalledWith('/prowadz 10276');
    findingRow.klik('🗑');
    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)).toEqual([]);
    expect(mock.api.output.print).toHaveBeenCalledWith(
      '[poko] Usunieto #1: Galezowaty pokoniunkcyjny klabart (10276).',
    );
    expect(mock.api.output.print).toHaveBeenCalledWith('[poko] Brak zapisanych stworow.');
  });

  it('starts /prowadz and runs vid after 500 ms when the distance is clicked', async () => {
    vi.useFakeTimers();
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 10276,
      short: 'Galezowaty pokoniunkcyjny klabart',
      areaId: 7,
      areaName: 'Poludniowe Kaedwen',
    }]);
    const mock = createMockApi({ room: { id: 10000, area: 7 } });
    mock.api.map.findPath = vi.fn(() => [10000, 10001, 10276]);
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko');

    const row = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([value]) => value)
      .find((value): value is MockAnsiAwareBuffer => (
        value instanceof MockAnsiAwareBuffer && value.text.includes('Galezowaty')
      ))!;
    row.klik('2 lok.');

    expect(mock.api.command.send).toHaveBeenCalledWith('/prowadz 10276');
    await vi.advanceTimersByTimeAsync(499);
    expect(mock.api.output.print).not.toHaveBeenCalledWith('--> ruszam');
    await vi.advanceTimersByTimeAsync(1);
    expect(mock.api.output.print).toHaveBeenCalledWith('--> ruszam');
    expect(vi.mocked(mock.api.command.send).mock.calls.map(([command]) => command)).toEqual([
      '/prowadz 10276',
      '/dalej 2',
      '/walkerw',
    ]);
  });

  it('persists and toggles the slain/visited checkbox', () => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 10276,
      short: 'Galezowaty pokoniunkcyjny klabart',
      areaId: 7,
      areaName: 'Poludniowe Kaedwen',
    }]);
    const mock = createMockApi({ room: { id: 10000, area: 7 } });
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko');

    const printedRows = () => (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([value]) => value)
      .filter((value): value is MockAnsiAwareBuffer => (
        value instanceof MockAnsiAwareBuffer && value.text.includes('Galezowaty')
      ));
    const latestRow = () => {
      const rows = printedRows();
      return rows[rows.length - 1]!;
    };

    latestRow().klik('[ ]');
    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)?.[0].slain).toBe(true);

    const checkedRow = latestRow();
    expect(checkedRow.segments.some((segment) => segment.state?.value === '#484848')).toBe(true);
    checkedRow.klik('[✓]');
    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)?.[0].slain).toBe(false);
  });

  it('clears every slain status with the table button', () => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [
      {
        roomId: 10276,
        short: 'Galezowaty pokoniunkcyjny klabart',
        areaId: 7,
        areaName: 'Poludniowe Kaedwen',
        slain: true,
      },
      {
        roomId: 10272,
        short: 'Pokoniunkcyjny glazowy stwor',
        areaId: 7,
        areaName: 'Poludniowe Kaedwen',
        slain: true,
      },
    ]);
    const mock = createMockApi({ room: { id: 10000, area: 7 } });
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko');

    const button = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([value]) => value)
      .find((value): value is MockAnsiAwareBuffer => (
        value instanceof MockAnsiAwareBuffer && value.text === '[CLEAR]'
      ))!;
    const printCalls = vi.mocked(mock.api.output.print).mock.calls;
    expect(printCalls[printCalls.length - 1]?.[0]).toBe(button);
    button.klik('[CLEAR]');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)?.every((finding) => finding.slain === false)).toBe(true);
  });

  it('tints the current room row green when its distance is zero', () => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 10276,
      short: 'Galezowaty pokoniunkcyjny klabart',
      areaId: 7,
      areaName: 'Poludniowe Kaedwen',
    }]);
    const mock = createMockApi({ room: { id: 10276, area: 7 } });
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko');

    const row = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([value]) => value)
      .find((value): value is MockAnsiAwareBuffer => (
        value instanceof MockAnsiAwareBuffer && value.text.includes('Galezowaty')
      ))!;

    expect(row.segments[0].state).toMatchObject({ value: '#6f8f78' });
    expect(row.text).toContain(' 0 lok. |');
  });

  it('sorts displayed rows by live distance and leaves unreachable rooms last', () => {
    const findings: PokFinding[] = [
      { roomId: 300, short: 'Far', areaId: 7, areaName: 'Area' },
      { roomId: 400, short: 'Unreachable', areaId: 7, areaName: 'Area' },
      { roomId: 100, short: 'Current', areaId: 7, areaName: 'Area' },
      { roomId: 200, short: 'Near', areaId: 7, areaName: 'Area' },
    ];
    storage.set(POK_STORAGE_KEY, findings);
    const mock = createMockApi({ room: { id: 100, area: 7 } });
    mock.api.map.findPath = vi.fn((_fromId: number, toId: number) => {
      if (toId === 200) return [100, 150, 200];
      if (toId === 300) return [100, 150, 200, 250, 300];
      return null;
    });
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko');

    const displayedShorts = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([value]) => value)
      .filter((value): value is MockAnsiAwareBuffer => value instanceof MockAnsiAwareBuffer)
      .map((row) => findings.find((finding) => row.text.includes(finding.short))?.short)
      .filter((short): short is string => short !== undefined);

    expect(displayedShorts).toEqual(['Current', 'Near', 'Far', 'Unreachable']);
    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)?.map((finding) => finding.roomId)).toEqual([
      300, 400, 100, 200,
    ]);
  });

  it('previews a finding for 3 seconds and returns to the original map room', async () => {
    vi.useFakeTimers();
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 10276,
      short: 'Galezowaty pokoniunkcyjny klabart',
      areaId: 7,
      areaName: 'Poludniowe Kaedwen',
    }]);
    const mock = createMockApi({ room: { id: 10000, area: 7 } });
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko');

    const row = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([value]) => value)
      .find((value): value is MockAnsiAwareBuffer => (
        value instanceof MockAnsiAwareBuffer && value.text.includes('Galezowaty')
      ))!;
    row.klik('👁');

    expect(mock.api.command.send).toHaveBeenCalledWith('/ustaw 10276');
    await vi.advanceTimersByTimeAsync(2999);
    expect(mock.api.command.send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(mock.api.command.send).toHaveBeenLastCalledWith('/ustaw 10000');
  });

  it('supports poko as a shortcut for the findings list', () => {
    const mock = createMockApi();
    setupPok(mock.api);

    runAlias(mock.aliases, 'poko');

    expect(mock.api.output.print).toHaveBeenCalledWith('[poko] Brak zapisanych stworow.');
  });

  it('supports poko_lista but no longer handles old pok aliases', () => {
    const mock = createMockApi();
    setupPok(mock.api);

    runAlias(mock.aliases, 'poko_lista');
    expect(mock.aliases.some((alias) => alias.pattern.test('pok!'))).toBe(false);
    expect(mock.aliases.some((alias) => alias.pattern.test('pok_lista'))).toBe(false);
    expect(mock.aliases.some((alias) => alias.pattern.test('pok_reset'))).toBe(false);
    expect(mock.aliases.some((alias) => alias.pattern.test('pok+'))).toBe(false);
    expect(mock.aliases.some((alias) => alias.pattern.test('pok-'))).toBe(false);
  });

  it('uses poko_tu to look and replace a manual description with the current creature short', () => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 22259,
      short: 'Wiwerna (padla wiec bez shorta)',
      areaId: 9,
      areaName: 'Wschodni Mahakam',
    }]);
    const mock = createMockApi({ room: { id: 22259, area: 9 } });
    (mock.api as any).objects = {
      getObjectsOnLocation: vi.fn(() => [
        { num: 1, desc: 'Ponury mahakamski kupiec', __category: 'rest-noncombat' },
        { num: 2, desc: 'pospolita wezowata wiwerna', __category: 'rest' },
      ]),
    };
    const cleanup = setupPok(mock.api);

    runAlias(mock.aliases, 'poko_tu');
    expect(mock.api.command.send).toHaveBeenCalledWith('zerknij');
    mock.api.events.emit('parsedObjects');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)?.[0].short).toBe('Pospolita wezowata wiwerna');
    expect(mock.api.output.print).toHaveBeenCalledWith(
      '[poko] Wpis zostal nadpisany: Wiwerna (padla wiec bez shorta) -> Pospolita wezowata wiwerna.',
    );
    const printCalls = vi.mocked(mock.api.output.print).mock.calls;
    expect(printCalls[printCalls.length - 1]?.[0]).toBe(
      '[poko] Wpis zostal nadpisany: Wiwerna (padla wiec bez shorta) -> Pospolita wezowata wiwerna.',
    );

    cleanup();
    expect(mock.eventListeners.get('parsedObjects')).toEqual([]);
  });

  it('captures a known short directly from zerknij output when parsedObjects is not emitted', async () => {
    vi.useFakeTimers();
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 22259,
      short: 'Wipper (padl wiec bez shorta)',
      areaId: 9,
      areaName: 'Wschodni Mahakam',
    }]);
    const mock = createMockApi({ room: { id: 22259, area: 9 } });
    setupPok(mock.api);

    runAlias(mock.aliases, 'poko_tu');
    runLine(mock, 'W gorach.');
    runLine(mock, 'Drapiezny wezowaty wipper.');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)?.[0].short).toBe('Drapiezny wezowaty wipper');
    expect(mock.api.output.print).toHaveBeenCalledWith(
      '[poko] Wpis zostal nadpisany: Wipper (padl wiec bez shorta) -> Drapiezny wezowaty wipper.',
    );
    await vi.advanceTimersByTimeAsync(5000);
    expect(mock.api.output.print).not.toHaveBeenCalledWith(
      '[poko] Nie otrzymano listy stworow po komendzie zerknij.',
    );
  });

  it('captures Szybki agresywny widlogon directly from zerknij output', () => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 21982,
      short: 'Widlogon (reczny opis)',
      areaId: 9,
      areaName: 'Wschodni Mahakam',
    }]);
    const mock = createMockApi({ room: { id: 21982, area: 9 } });
    setupPok(mock.api);

    runAlias(mock.aliases, 'poko_tu');
    runLine(mock, 'Szybki agresywny widlogon.');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)?.[0].short).toBe('Szybki agresywny widlogon');
    expect(mock.api.output.print).toHaveBeenCalledWith(
      '[poko] Wpis zostal nadpisany: Widlogon (reczny opis) -> Szybki agresywny widlogon.',
    );
  });

  it('does not run poko_tu without a saved finding in the current room', () => {
    const mock = createMockApi({ room: { id: 22259, area: 9 } });
    setupPok(mock.api);

    runAlias(mock.aliases, 'poko_tu');

    expect(mock.api.command.send).not.toHaveBeenCalled();
    expect(mock.api.output.print).toHaveBeenCalledWith('[poko] Brak zapisanego stwora na tej lokacji.');
  });

  it('clears all saved findings with poko_reset', () => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 10276,
      short: 'Galezowaty pokoniunkcyjny klabart',
      areaId: 7,
      areaName: 'Poludniowe Kaedwen',
    }]);
    const mock = createMockApi();
    setupPok(mock.api);

    runAlias(mock.aliases, 'poko_reset');

    expect(storage.get(POK_STORAGE_KEY)).toBeNull();
    expect(mock.api.output.print).toHaveBeenCalledWith('[poko] Lista zostala wyzerowana.');
    runAlias(mock.aliases, 'poko');
    expect(mock.api.output.print).toHaveBeenLastCalledWith('[poko] Brak zapisanych stworow.');
  });

  it('does not save when the current map room is unavailable', () => {
    const mock = createMockApi();
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko+');

    expect(() => runLine(mock, 'Potezna skrzydlata bestia warczy.')).not.toThrow();
    expect(storage.get(POK_STORAGE_KEY)).toBeNull();
    expect(mock.api.output.print).toHaveBeenCalledWith(expect.stringContaining('mapa nie zna'));
  });
});
