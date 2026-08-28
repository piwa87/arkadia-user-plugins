import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storage } from '../../../src/lib/storage';
import {
  POK_STORAGE_KEY,
  createPokState,
  setupPok,
  type PokFinding,
} from '../../../src/plugins/core-plugin/mod_pok';
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

describe('mod_pok', () => {
  it('registers only token-gated creature triggers', () => {
    const mock = createMockApi();
    setupPok(mock.api);

    expect(mock.triggers.filter((trigger) => trigger.tag === 'mod_pok')).toHaveLength(0);
    expect(mock.tokenTriggers.some((trigger) => trigger.tag === 'mod_pok' && trigger.token === 'wiwerna')).toBe(true);
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
    runAlias(mock.aliases, 'pok+');

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
    runAlias(mock.aliases, 'pok+');

    runLine(mock, 'Omszala jadowita kergulena.');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)).toContainEqual({
      roomId: 12345,
      short: 'Omszala jadowita kergulena',
      areaId: 8,
      areaName: 'Testowy obszar',
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

    runAlias(mock.aliases, 'pok_lista');

    const rows = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([value]) => value)
      .filter((value): value is MockAnsiAwareBuffer => value instanceof MockAnsiAwareBuffer);
    const findingRow = rows.find((row) => row.text.includes('Galezowaty'))!;
    expect(findingRow.text).toContain(' 2 |');
    const idSegment = findingRow.segments.find((segment) => segment.text === '10276')!;
    expect(idSegment.state).toMatchObject({
      value: '#2f855a',
      underline: true,
      hyperlink: expect.any(Object),
    });
    const afterId = findingRow.segments.slice(findingRow.segments.indexOf(idSegment) + 1);
    expect(afterId.filter((segment) => segment.state?.hyperlink).map((segment) => segment.text)).toEqual(['[ ]', '👁', '🗑']);
    expect(afterId[0].state).toMatchObject({ value: '#929292' });
    const header = rows.find((row) => row.text.includes('| LOC') && row.text.includes('| DIS'))!;
    expect(header.text).not.toContain('PODG');
    expect(header.text).not.toContain('USUN');
    findingRow.klik('10276');
    expect(mock.api.command.send).toHaveBeenCalledWith('/prowadz 10276');
    findingRow.klik('🗑');
    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)).toEqual([]);
    expect(mock.api.output.print).toHaveBeenCalledWith(
      '[pok] Usunieto #1: Galezowaty pokoniunkcyjny klabart (10276).',
    );
    expect(mock.api.output.print).toHaveBeenCalledWith('[pok] Brak zapisanych stworow.');
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
    runAlias(mock.aliases, 'pok!');

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

  it('tints the current room row green when its distance is zero', () => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 10276,
      short: 'Galezowaty pokoniunkcyjny klabart',
      areaId: 7,
      areaName: 'Poludniowe Kaedwen',
    }]);
    const mock = createMockApi({ room: { id: 10276, area: 7 } });
    setupPok(mock.api);
    runAlias(mock.aliases, 'pok!');

    const row = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([value]) => value)
      .find((value): value is MockAnsiAwareBuffer => (
        value instanceof MockAnsiAwareBuffer && value.text.includes('Galezowaty')
      ))!;

    expect(row.segments[0].state).toMatchObject({ value: '#6f8f78' });
    expect(row.text).toContain(' 0 |');
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
    runAlias(mock.aliases, 'pok!');

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
    runAlias(mock.aliases, 'pok!');

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

  it('supports pok! as a shortcut for the findings list', () => {
    const mock = createMockApi();
    setupPok(mock.api);

    runAlias(mock.aliases, 'pok!');

    expect(mock.api.output.print).toHaveBeenCalledWith('[pok] Brak zapisanych stworow.');
  });

  it('supports pok_lista but no longer handles /pok_lista or pok_import', () => {
    const mock = createMockApi();
    setupPok(mock.api);

    runAlias(mock.aliases, 'pok_lista');
    expect(mock.aliases.some((alias) => alias.pattern.test('/pok_lista'))).toBe(false);
    expect(mock.aliases.some((alias) => alias.pattern.test('pok_import'))).toBe(false);
  });

  it('clears all saved findings with pok_reset', () => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 10276,
      short: 'Galezowaty pokoniunkcyjny klabart',
      areaId: 7,
      areaName: 'Poludniowe Kaedwen',
    }]);
    const mock = createMockApi();
    setupPok(mock.api);

    runAlias(mock.aliases, 'pok_reset');

    expect(storage.get(POK_STORAGE_KEY)).toBeNull();
    expect(mock.api.output.print).toHaveBeenCalledWith('[pok] Lista zostala wyzerowana.');
    runAlias(mock.aliases, 'pok!');
    expect(mock.api.output.print).toHaveBeenLastCalledWith('[pok] Brak zapisanych stworow.');
  });

  it('does not save when the current map room is unavailable', () => {
    const mock = createMockApi();
    setupPok(mock.api);
    runAlias(mock.aliases, 'pok+');

    expect(() => runLine(mock, 'Potezna skrzydlata bestia warczy.')).not.toThrow();
    expect(storage.get(POK_STORAGE_KEY)).toBeNull();
    expect(mock.api.output.print).toHaveBeenCalledWith(expect.stringContaining('mapa nie zna'));
  });
});
