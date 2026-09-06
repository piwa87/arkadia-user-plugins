import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadMobLocations,
  setupTro,
  TRO_STORAGE_KEY,
  type MobLocation,
} from '../../../src/plugins/core-plugin/trolle';
import { DYNAMIC_WALKER_START_EVENT } from '../../../src/plugins/core-plugin/walker';
import { createMockApi, MockAnsiAwareBuffer } from '../../helpers/mockApi';

class FakeElement {
  children: FakeElement[] = [];
  className = '';
  textContent = '';
  title = '';
  type = '';
  onclick: (() => void) | null = null;

  constructor(public tag: string) {}

  append(...children: FakeElement[]): void {
    this.children.push(...children);
  }

  find(predicate: (element: FakeElement) => boolean): FakeElement | null {
    for (const child of this.children) {
      if (predicate(child)) return child;
      const nested = child.find(predicate);
      if (nested) return nested;
    }
    return null;
  }

  button(label: string): FakeElement {
    const button = this.find((element) => element.tag === 'button' && element.textContent === label);
    expect(button, `missing button: ${label}`).not.toBeNull();
    return button!;
  }

  get text(): string {
    return [this.textContent, ...this.children.map((child) => child.text)].join(' ');
  }
}

function makeLocalStorageMock(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => data.set(key, value)),
    removeItem: vi.fn((key: string) => data.delete(key)),
    clear: vi.fn(() => data.clear()),
  };
}

function runAlias(aliases: ReturnType<typeof createMockApi>['aliases'], command: string): void {
  const alias = aliases.find((entry) => entry.pattern.test(command));
  expect(alias, `missing alias for ${command}`).toBeDefined();
  alias!.callback(command.match(alias!.pattern) as RegExpMatchArray);
}

function tableRows(mock: ReturnType<typeof createMockApi>): MockAnsiAwareBuffer[] {
  return (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
    .map(([value]) => value)
    .filter((value): value is MockAnsiAwareBuffer => (
      value instanceof MockAnsiAwareBuffer && value.text.startsWith('| ')
    ));
}

const entries: MobLocation[] = [
  { active: '1', mobType: 'pbt', roomId: 13771, time: 1_787_756_195 },
  { active: '0', mobType: 'besti', roomId: 14000, time: 1_787_752_600, note: 'z gildii' },
];
const hiddenEntry: MobLocation = {
  active: '1', mobType: 'kamienny', roomId: 15000, time: 1_787_752_000,
};
const entryRecord = {
  '13771pbt': entries[0],
  '14000besti': entries[1],
  '15000kamienny': hiddenEntry,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(1_787_756_200_000));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('trolle mobLocations', () => {
  it('reads the client object indexed by keys such as 13771pbt', () => {
    vi.stubGlobal('localStorage', makeLocalStorageMock({
      [TRO_STORAGE_KEY]: JSON.stringify({
        ...entryRecord,
        invalid: { active: '1', mobType: '', roomId: 'bad', time: 0 },
      }),
    }));

    expect(loadMobLocations()).toEqual([...entries, hiddenEntry]);
  });

  it('shows a live-distance table sorted by distance', () => {
    vi.stubGlobal('localStorage', makeLocalStorageMock({
      [TRO_STORAGE_KEY]: JSON.stringify(entryRecord),
    }));
    const mock = createMockApi({ room: { id: 13000, area: 52 } });
    mock.api.map.findPath = vi.fn((_from, to) => (
      to === 14000 ? [13000, 14000] : [13000, 13001, 13771]
    ));
    mock.api.map.getRoomById = vi.fn((id) => ({ id, area: id === 14000 ? 62 : 52 })) as any;
    mock.api.map.getAreas = vi.fn(() => [
      { areaId: 52, areaName: 'Ziemie Czaszki', rooms: [] },
      { areaId: 62, areaName: 'Pustkowia - okolice', rooms: [] },
    ]) as any;
    setupTro(mock.api);

    runAlias(mock.aliases, 'tro');

    const rows = tableRows(mock);
    expect(rows).toHaveLength(2);
    expect(rows[0].text).toContain('| 14000 | 1 lok. | besti | 💀 | 👁 | 🗑 |');
    expect(rows[1].text).toContain('| 13771 | 2 lok. | pbt');
    expect(rows.some((row) => row.text.includes('kamienny'))).toBe(false);
    expect(rows[1].text).toContain('|    | 👁 | 🗑 |');
    expect(rows[0].segments[0].state).toMatchObject({ value: '#484848' });
    expect(rows[1].segments[0].state).toMatchObject({ value: '#929292' });
    const clickableSegments = rows.flatMap((row) => row.segments.filter((segment) => segment.state?.hyperlink));
    expect(clickableSegments.every((segment) => segment.state?.underline === false)).toBe(true);
  });

  it('starts the dynamic walker manually from ID and automatically from distance', () => {
    vi.stubGlobal('localStorage', makeLocalStorageMock({
      [TRO_STORAGE_KEY]: JSON.stringify({ '13771pbt': entries[0] }),
    }));
    const mock = createMockApi({ room: { id: 13000, area: 52 } });
    mock.api.map.findPath = vi.fn(() => [13000, 13771]);
    mock.api.map.getRoomById = vi.fn(() => ({ id: 13771, area: 52 })) as any;
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 52, areaName: 'Ziemie Czaszki', rooms: [] }]) as any;
    setupTro(mock.api);
    runAlias(mock.aliases, 'tro_lista');
    const row = tableRows(mock)[0];

    row.klik('13771');
    row.klik('1 lok.');

    expect(mock.api.events.emit).toHaveBeenNthCalledWith(1, DYNAMIC_WALKER_START_EVENT, {
      roomId: 13771,
      label: 'pbt',
      automatic: false,
    });
    expect(mock.api.events.emit).toHaveBeenNthCalledWith(2, DYNAMIC_WALKER_START_EVENT, {
      roomId: 13771,
      label: 'pbt',
      automatic: true,
    });
  });

  it('previews for three seconds and restores the original map room', async () => {
    vi.stubGlobal('localStorage', makeLocalStorageMock({
      [TRO_STORAGE_KEY]: JSON.stringify({ '13771pbt': entries[0] }),
    }));
    const mock = createMockApi({ room: { id: 13000, area: 52 } });
    mock.api.map.findPath = vi.fn(() => [13000, 13771]);
    mock.api.map.getRoomById = vi.fn(() => ({ id: 13771, area: 52 })) as any;
    setupTro(mock.api);
    runAlias(mock.aliases, 'tro');

    tableRows(mock)[0].klik('👁');
    expect(mock.api.command.send).toHaveBeenCalledWith('/ustaw 13771');
    await vi.advanceTimersByTimeAsync(3000);
    expect(mock.api.command.send).toHaveBeenLastCalledWith('/ustaw 13000');
  });

  it('toggles active and deletes an entry while retaining its extra data', () => {
    const storage = makeLocalStorageMock({
      [TRO_STORAGE_KEY]: JSON.stringify({ ...entryRecord, metadata: { version: 2 } }),
    });
    vi.stubGlobal('localStorage', storage);
    const mock = createMockApi({ room: { id: 13000, area: 52 } });
    mock.api.map.findPath = vi.fn(() => [13000, 13771]);
    mock.api.map.getRoomById = vi.fn(() => ({ id: 13771, area: 52 })) as any;
    setupTro(mock.api);
    runAlias(mock.aliases, 'tro');

    const firstTable = tableRows(mock);
    firstTable.find((row) => row.text.includes('14000'))!.klik('💀');
    expect(JSON.parse(storage.data.get(TRO_STORAGE_KEY)!)).toEqual({
      '13771pbt': entries[0],
      '14000besti': { ...entries[1], active: '1' },
      '15000kamienny': hiddenEntry,
      metadata: { version: 2 },
    });

    const latestRows = tableRows(mock);
    const matchingRows = latestRows.filter((row) => row.text.includes('13771'));
    matchingRows[matchingRows.length - 1].klik('🗑');
    expect(JSON.parse(storage.data.get(TRO_STORAGE_KEY)!)).toEqual({
      '14000besti': { ...entries[1], active: '1' },
      '15000kamienny': hiddenEntry,
      metadata: { version: 2 },
    });
    expect(mock.api.output.print).toHaveBeenCalledWith('[tro] Usunieto pbt z lokacji 13771.');
  });

  it('reloads mobLocations every time the alias is used', () => {
    const storage = makeLocalStorageMock({ [TRO_STORAGE_KEY]: '[]' });
    vi.stubGlobal('localStorage', storage);
    const mock = createMockApi({ room: { id: 13000, area: 52 } });
    mock.api.map.findPath = vi.fn(() => [13000, 13771]);
    mock.api.map.getRoomById = vi.fn(() => ({ id: 13771, area: 52 })) as any;
    setupTro(mock.api);

    runAlias(mock.aliases, 'tro');
    expect(mock.api.output.print).toHaveBeenCalledWith('[tro] Brak wpisow pbt/besti.');
    storage.data.set(TRO_STORAGE_KEY, JSON.stringify({ '13771pbt': entries[0] }));
    runAlias(mock.aliases, 'tro');
    expect(tableRows(mock)).toHaveLength(1);
  });

  it('limits tro to the 30 nearest rows while tro_all shows everything', () => {
    const manyEntries = Object.fromEntries(Array.from({ length: 35 }, (_, index) => {
      const roomId = 20_035 - index;
      return [`${roomId}pbt`, {
        active: '1',
        mobType: 'pbt',
        roomId,
        time: entries[0].time,
      }];
    }));
    vi.stubGlobal('localStorage', makeLocalStorageMock({
      [TRO_STORAGE_KEY]: JSON.stringify(manyEntries),
    }));
    const mock = createMockApi({ room: { id: 20_000, area: 52 } });
    mock.api.map.findPath = vi.fn((_from, to) => new Array((to as number) - 20_000 + 1).fill(0));
    mock.api.map.getRoomById = vi.fn((id) => ({ id, area: 52 })) as any;
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 52, areaName: 'Ziemie Czaszki', rooms: [] }]) as any;
    setupTro(mock.api);

    runAlias(mock.aliases, 'tro');
    const limitedRows = tableRows(mock);
    expect(limitedRows).toHaveLength(30);
    expect(limitedRows[0].text).toContain('20001');
    expect(limitedRows[29].text).toContain('20030');
    expect(limitedRows.some((row) => row.text.includes('20031'))).toBe(false);

    vi.mocked(mock.api.output.print).mockClear();
    runAlias(mock.aliases, 'tro_all');
    expect(tableRows(mock)).toHaveLength(35);
  });

  it('opens a graphical window with the same walker and status actions', async () => {
    const storage = makeLocalStorageMock({
      [TRO_STORAGE_KEY]: JSON.stringify(entryRecord),
    });
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('document', {
      createElement: (tag: string) => new FakeElement(tag),
    });
    const mock = createMockApi({ room: { id: 13000, area: 52 } });
    mock.api.map.findPath = vi.fn((_from, to) => (
      to === 14000 ? [13000, 14000] : [13000, 13001, 13771]
    ));
    mock.api.map.getRoomById = vi.fn((id) => ({ id, area: id === 14000 ? 62 : 52 })) as any;
    mock.api.map.getAreas = vi.fn(() => [
      { areaId: 52, areaName: 'Ziemie Czaszki', rooms: [] },
      { areaId: 62, areaName: 'Pustkowia - okolice', rooms: [] },
    ]) as any;
    const cleanup = setupTro(mock.api);

    expect(mock.api.ui.addPopupMenuEntry).toHaveBeenCalledWith('Trolle', expect.any(Function));
    runAlias(mock.aliases, 'trow');
    await vi.waitFor(() => expect(mock.api.ui.registerPersistentPopup).toHaveBeenCalled());
    const popupCalls = vi.mocked(mock.api.ui.registerPersistentPopup).mock.calls;
    const popupOptions = popupCalls[popupCalls.length - 1][0] as any;
    const window = popupOptions.createContent() as unknown as FakeElement;
    const windowText = window.text.replace(/\s+/g, ' ');

    expect(windowText).toContain('ID Dist. Typ Stan Akcje');
    expect(windowText).toContain('14000 1 besti 💀');
    expect(windowText).toContain('13771 2 pbt');
    expect(windowText).not.toContain('kamienny');
    expect(windowText).toContain('Najblizsze 30 Wszystkie');

    window.button('1').onclick!();
    expect(mock.api.events.emit).toHaveBeenCalledWith(DYNAMIC_WALKER_START_EVENT, {
      roomId: 14000,
      label: 'besti',
      automatic: true,
    });

    window.button('💀').onclick!();
    expect(JSON.parse(storage.data.get(TRO_STORAGE_KEY)!)['14000besti'].active).toBe('1');
    cleanup();
  });

  it('tro! walks to the nearest reachable living pbt and ignores besti and dead trolls', () => {
    const nearestDead: MobLocation = { active: '0', mobType: 'pbt', roomId: 13001, time: 1 };
    const nearestBesti: MobLocation = { active: '1', mobType: 'besti', roomId: 13002, time: 1 };
    const nearestLivingTroll: MobLocation = { active: '1', mobType: 'pbt', roomId: 13003, time: 1 };
    const unreachableTroll: MobLocation = { active: '1', mobType: 'pbt', roomId: 13999, time: 1 };
    vi.stubGlobal('localStorage', makeLocalStorageMock({
      [TRO_STORAGE_KEY]: JSON.stringify({
        '13001pbt': nearestDead,
        '13002besti': nearestBesti,
        '13003pbt': nearestLivingTroll,
        '13999pbt': unreachableTroll,
      }),
    }));
    const mock = createMockApi({ room: { id: 13000, area: 52 } });
    mock.api.map.findPath = vi.fn((_from, to) => {
      if (to === 13999) return null;
      return new Array((to as number) - 13000 + 1).fill(0);
    });
    setupTro(mock.api);

    runAlias(mock.aliases, 'tro!');

    expect(mock.api.events.emit).toHaveBeenCalledWith(DYNAMIC_WALKER_START_EVENT, {
      roomId: 13003,
      label: 'pbt',
      automatic: true,
    });
  });

  it('tro! reports when no living pbt is reachable', () => {
    vi.stubGlobal('localStorage', makeLocalStorageMock({
      [TRO_STORAGE_KEY]: JSON.stringify({
        '13001pbt': { active: '0', mobType: 'pbt', roomId: 13001, time: 1 },
        '13002besti': { active: '1', mobType: 'besti', roomId: 13002, time: 1 },
      }),
    }));
    const mock = createMockApi({ room: { id: 13000, area: 52 } });
    mock.api.map.findPath = vi.fn(() => [13000, 13001]);
    setupTro(mock.api);

    runAlias(mock.aliases, 'tro!');

    expect(mock.api.output.print).toHaveBeenCalledWith('[tro] Brak osiagalnego zywego trolla.');
    expect(mock.api.events.emit).not.toHaveBeenCalledWith(
      DYNAMIC_WALKER_START_EVENT,
      expect.anything(),
    );
  });
});
