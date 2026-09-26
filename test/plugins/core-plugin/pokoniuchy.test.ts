import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storage } from '../../../src/lib/storage';
import {
  POK_SHORTS,
  POK_STORAGE_KEY,
  POK_WORLD_REBIRTH_STORAGE_KEY,
  WORLD_REBIRTH_STORAGE_KEY,
  createPokState,
  setupPok,
  type PokFinding,
} from '../../../src/plugins/core-plugin/pokoniuchy';
import { createMockApi, MockAnsiAwareBuffer, runLine } from '../../helpers/mockApi';

class FakeElement {
  children: FakeElement[] = [];
  className = '';
  textContent = '';
  title = '';
  type = '';
  disabled = false;
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
  vi.unstubAllGlobals();
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

  it('remembers the current world rebirth without warning on first observation', () => {
    localStorage.setItem(WORLD_REBIRTH_STORAGE_KEY, '1789474382');
    const mock = createMockApi();

    setupPok(mock.api);

    expect(storage.get(POK_WORLD_REBIRTH_STORAGE_KEY)).toBe(1789474382);
    expect(mock.api.output.print).not.toHaveBeenCalledWith(expect.stringContaining('Swiat odrodzil sie'));
  });

  it('warns once when saved findings come from an earlier world rebirth', () => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 22259,
      short: 'Grozna wezowata wiwerna',
      areaId: 9,
      areaName: 'Wschodni Mahakam',
    }]);
    storage.set(POK_WORLD_REBIRTH_STORAGE_KEY, 1788264782);
    localStorage.setItem(WORLD_REBIRTH_STORAGE_KEY, '1789474382');
    const mock = createMockApi();

    setupPok(mock.api);
    setupPok(mock.api);

    expect(mock.api.output.print).toHaveBeenCalledTimes(1);
    expect(mock.api.output.print).toHaveBeenCalledWith(expect.stringContaining(
      'Zapisane lokacje pokoniuchow moga byc nieaktualne',
    ));
    expect(storage.get(POK_WORLD_REBIRTH_STORAGE_KEY)).toBe(1789474382);
  });

  it('detects a world rebirth reported by the system command after setup', async () => {
    vi.useFakeTimers();
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 22259,
      short: 'Grozna wezowata wiwerna',
      areaId: 9,
      areaName: 'Wschodni Mahakam',
    }]);
    storage.set(POK_WORLD_REBIRTH_STORAGE_KEY, 1788264782);
    localStorage.setItem(WORLD_REBIRTH_STORAGE_KEY, '1788264782');
    const mock = createMockApi();
    setupPok(mock.api);

    localStorage.setItem(WORLD_REBIRTH_STORAGE_KEY, '1789474382');
    runLine(mock, 'Swiat odrodzil sie  : Wt, 15 IX 2026, 14:13:02');
    await vi.advanceTimersByTimeAsync(0);

    expect(mock.api.output.print).toHaveBeenCalledWith(expect.stringContaining(
      'Zapisane lokacje pokoniuchow moga byc nieaktualne',
    ));
    expect(storage.get(POK_WORLD_REBIRTH_STORAGE_KEY)).toBe(1789474382);
  });

  it('prints a dedicated command and list-controls help', () => {
    const mock = createMockApi();
    setupPok(mock.api);

    runAlias(mock.aliases, 'poko_help');

    const output = vi.mocked(mock.api.output.print).mock.calls
      .map(([value]) => value instanceof MockAnsiAwareBuffer ? value.text : String(value))
      .join('\n');
    expect(output).toContain('POKONIUCHY');
    expect(output).toContain('poko+');
    expect(output).toContain('pokow');
    expect(output).toContain('poko_dodaj <opis>');
    expect(output).toContain('poko_reset');
    expect(output).toContain('poko_zglos');
    expect(output).toContain('ID lokacji');
    expect(output).toContain('💀');
    expect(output).toContain('CLEAR');
  });

  it('prints clickable GitHub links for bugs, ideas and existing issues', () => {
    const open = vi.fn();
    vi.stubGlobal('window', { open });
    const mock = createMockApi();
    setupPok(mock.api);

    runAlias(mock.aliases, 'poko_zglos');

    const menu = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([value]) => value)
      .find((value): value is MockAnsiAwareBuffer => (
        value instanceof MockAnsiAwareBuffer && value.text.includes('[BLAD]')
      ))!;
    expect(menu.text).toBe('[poko] Zgloszenie: [BLAD]  [POMYSL]  [ZGLOSZENIA]');

    menu.klik('[BLAD]');
    menu.klik('[POMYSL]');
    menu.klik('[ZGLOSZENIA]');

    expect(open).toHaveBeenNthCalledWith(
      1,
      'https://github.com/piwa87/arkadia-user-plugins/issues/new?template=pokoniuchy_bug.yml&version=1.1.2',
      '_blank',
      'noopener,noreferrer',
    );
    expect(open).toHaveBeenNthCalledWith(
      2,
      'https://github.com/piwa87/arkadia-user-plugins/issues/new?template=pokoniuchy_feature.yml&version=1.1.2',
      '_blank',
      'noopener,noreferrer',
    );
    expect(open).toHaveBeenNthCalledWith(
      3,
      'https://github.com/piwa87/arkadia-user-plugins/issues',
      '_blank',
      'noopener,noreferrer',
    );
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

  it.each([
    ['wipper', 'Ponury szybki wipper', 12346],
    ['endriaga', 'Mala jadowita endriaga', 12350],
    ['harpia', 'Ludzkoglowa niebezpieczna harpia', 12353],
    ['harpia', 'Gladkolica niebezpieczna harpia', 12354],
    ['oszluzg', 'Stary powolny oszluzg', 12351],
    ['widlogon', 'Wielki wsciekly widlogon', 12352],
  ])('recognizes any two-adjective %s description', (_creature, short, roomId) => {
    const mock = createMockApi({ room: { id: roomId, area: 8 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 8, areaName: 'Testowy obszar', rooms: [] }]) as any;
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko+');

    runLine(mock, `${short}.`);

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)).toContainEqual({
      roomId,
      short,
      areaId: 8,
      areaName: 'Testowy obszar',
    });
  });

  it('recognizes only the configured Dluga grozna bestia description', () => {
    const mock = createMockApi({ room: { id: 12356, area: 8 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 8, areaName: 'Testowy obszar', rooms: [] }]) as any;
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko+');

    runLine(mock, 'Dluga grozna bestia.');
    runLine(mock, 'Krotka lagodna bestia.');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)).toEqual([{
      roomId: 12356,
      short: 'Dluga grozna bestia',
      areaId: 8,
      areaName: 'Testowy obszar',
    }]);
  });

  it('recognizes multiple two-adjective harpies on one creature-list line', () => {
    const mock = createMockApi({ room: { id: 12355, area: 8 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 8, areaName: 'Testowy obszar', rooms: [] }]) as any;
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko+');

    runLine(mock, 'Duze ubite gniazdo i spore zwarte gniazdo. Nieduzy wapienny kamien.');
    runLine(mock, 'Ludzkoglowa niebezpieczna harpia i gladkolica niebezpieczna harpia.');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)).toEqual([
      {
        roomId: 12355,
        short: 'Ludzkoglowa niebezpieczna harpia',
        areaId: 8,
        areaName: 'Testowy obszar',
      },
      {
        roomId: 12355,
        short: 'Gladkolica niebezpieczna harpia',
        areaId: 8,
        areaName: 'Testowy obszar',
      },
    ]);
  });

  it('recognizes any two-adjective wiwerna description', () => {
    const mock = createMockApi({ room: { id: 12348, area: 8 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 8, areaName: 'Testowy obszar', rooms: [] }]) as any;
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko+');

    runLine(mock, 'Grozna wezowata wiwerna.');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)).toContainEqual({
      roomId: 12348,
      short: 'Grozna wezowata wiwerna',
      areaId: 8,
      areaName: 'Testowy obszar',
    });
  });

  it.each([
    'Na twoim lewym ramieniu siedzi kolczasta mloda wiwerna.',
    'Na twej glowie siedzi kolczasta mloda wiwerna.',
    'Na twoim plecaku siedzi kolczasta mloda wiwerna.',
  ])('ignores a wiwerna sitting on the character: %s', (line) => {
    const mock = createMockApi({ room: { id: 12348, area: 8 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 8, areaName: 'Testowy obszar', rooms: [] }]) as any;
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko+');

    runLine(mock, line);

    expect(storage.get(POK_STORAGE_KEY)).toBeNull();
  });

  it('ignores a personal wiwerna mentioned while sending it away', () => {
    const mock = createMockApi({ room: { id: 21710, area: 9 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 9, areaName: 'Wschodni Mahakam', rooms: [] }]) as any;
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko+');

    runLine(
      mock,
      'Wysylasz kolczasta mloda wiwerne na poczte. Kolczasta mloda wiwerna rozklada skrzydla i jednym mocnym machnieciem podrywa sie w powietrze. Po krotkiej chwili niknie ci z oczu.',
    );

    expect(storage.get(POK_STORAGE_KEY)).toBeNull();
  });

  it('always ignores the personal kolczasta mloda wiwerna short', () => {
    const mock = createMockApi({ room: { id: 21710, area: 9 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 9, areaName: 'Wschodni Mahakam', rooms: [] }]) as any;
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko+');

    runLine(mock, 'Kolczasta mloda wiwerna rozklada skrzydla.');

    expect(storage.get(POK_STORAGE_KEY)).toBeNull();
  });

  it('recognizes any two-adjective smok description', () => {
    const mock = createMockApi({ room: { id: 12349, area: 8 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 8, areaName: 'Testowy obszar', rooms: [] }]) as any;
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko+');

    runLine(mock, 'Stary potezny smok.');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)).toContainEqual({
      roomId: 12349,
      short: 'Stary potezny smok',
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

  it.each([
    ['Pospolita wezowata wiwerna', 'umarla'],
    ['Stary potezny smok', 'umarl'],
    ['Pokoniunkcyjny glazowy stwor', 'umarlo'],
  ])('marks a saved creature dead after the death line: %s %s', (short, deathVerb) => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 12349,
      short,
      areaId: 8,
      areaName: 'Testowy obszar',
    }]);
    const mock = createMockApi({ room: { id: 12349, area: 8 } });
    setupPok(mock.api);

    runLine(mock, `${short} ${deathVerb}.`);

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)?.[0].slain).toBe(true);
    expect(mock.api.output.print).toHaveBeenCalledWith(
      `[poko] Oznaczono jako zabitego: ${short} (12349).`,
    );
  });

  it('does not create a new finding from a creature death line', () => {
    const mock = createMockApi({ room: { id: 12349, area: 8 } });
    setupPok(mock.api);
    runAlias(mock.aliases, 'poko+');

    runLine(mock, 'Pospolita wezowata wiwerna umarla.');

    expect(storage.get(POK_STORAGE_KEY)).toBeNull();
    expect(mock.api.output.print).not.toHaveBeenCalledWith(expect.stringContaining('Oznaczono jako zabitego'));
  });

  it('marks only a matching finding in the current room', () => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [
      { roomId: 12349, short: 'Stary potezny smok', areaId: 8, areaName: 'Tutaj' },
      { roomId: 12350, short: 'Stary potezny smok', areaId: 8, areaName: 'Gdzie indziej' },
    ]);
    const mock = createMockApi({ room: { id: 12349, area: 8 } });
    setupPok(mock.api);

    runLine(mock, 'Stary potezny smok umarl.');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)?.map(({ slain }) => slain)).toEqual([true, undefined]);
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
      '2 lok.', '  ', '👁', '🗑',
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

  it('opens a graphical window with all actions from the output table', async () => {
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
      },
    ]);
    vi.stubGlobal('document', {
      createElement: (tag: string) => new FakeElement(tag),
    });
    const mock = createMockApi({ room: { id: 10000, area: 7 } });
    mock.api.map.findPath = vi.fn((_from, to) => (
      to === 10276 ? [10000, 10001, 10276] : [10000, 10272]
    ));
    const cleanup = setupPok(mock.api);

    expect(mock.api.ui.addPopupMenuEntry).toHaveBeenCalledWith('Pokoniuchy', expect.any(Function));
    runAlias(mock.aliases, 'pokow');
    await vi.waitFor(() => expect(mock.api.ui.registerPersistentPopup).toHaveBeenCalled());
    const popupCalls = vi.mocked(mock.api.ui.registerPersistentPopup).mock.calls;
    const popupOptions = popupCalls[popupCalls.length - 1][0] as any;
    const window = popupOptions.createContent() as unknown as FakeElement;
    const windowText = window.text.replace(/\s+/g, ' ');

    expect(windowText).toContain('ID Dist. Stwor Obszar Stan Akcje');
    expect(windowText).toContain('10272 1 Pokoniunkcyjny glazowy stwor Poludniowe Kaedwen');
    expect(windowText).toContain('10276 2 Galezowaty pokoniunkcyjny klabart Poludniowe Kaedwen 💀');

    window.button('10276').onclick!();
    expect(mock.api.command.send).toHaveBeenCalledWith('/prowadz 10276');

    window.button('2').onclick!();
    expect(mock.api.command.send).toHaveBeenCalledWith('/prowadz 10276');

    window.button('💀').onclick!();
    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)?.[0].slain).toBe(false);

    window.button('👁').onclick!();
    expect(mock.api.command.send).toHaveBeenCalledWith('/ustaw 10272');

    window.button('🗑').onclick!();
    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)?.map(({ roomId }) => roomId)).toEqual([10276]);

    cleanup();
    const menuHandle = vi.mocked(mock.api.ui.addPopupMenuEntry).mock.results[0].value;
    expect(menuHandle.remove).toHaveBeenCalledOnce();
  });

  it('refreshes an open graphical window when a creature dies', async () => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 10276,
      short: 'Pospolita wezowata wiwerna',
      areaId: 7,
      areaName: 'Poludniowe Kaedwen',
    }]);
    vi.stubGlobal('document', {
      createElement: (tag: string) => new FakeElement(tag),
    });
    const mock = createMockApi({ room: { id: 10276, area: 7 } });
    setupPok(mock.api);
    runAlias(mock.aliases, 'pokow');
    await vi.waitFor(() => expect(mock.api.ui.registerPersistentPopup).toHaveBeenCalled());
    const popupHandle = await vi.mocked(mock.api.ui.registerPersistentPopup).mock.results[0].value as any;
    popupHandle.isOpen = true;

    runLine(mock, 'Pospolita wezowata wiwerna umarla.');

    expect(popupHandle.setBody).toHaveBeenCalledOnce();
    const refreshedWindow = vi.mocked(popupHandle.setBody).mock.calls[0][0] as FakeElement;
    expect(refreshedWindow.text).toContain('💀');
  });

  it('debounces graphical distance refreshes until movement settles', async () => {
    storage.set<PokFinding[]>(POK_STORAGE_KEY, [{
      roomId: 10276,
      short: 'Galezowaty pokoniunkcyjny klabart',
      areaId: 7,
      areaName: 'Poludniowe Kaedwen',
    }]);
    vi.stubGlobal('document', {
      createElement: (tag: string) => new FakeElement(tag),
    });
    let currentRoomId = 10000;
    const mock = createMockApi();
    mock.api.map.getRoom = vi.fn(() => ({ id: currentRoomId, area: 7 })) as any;
    mock.api.map.findPath = vi.fn((from, to) => (from === to ? [from] : [from, to]));
    const cleanup = setupPok(mock.api);
    runAlias(mock.aliases, 'pokow');
    await vi.waitFor(() => expect(mock.api.ui.registerPersistentPopup).toHaveBeenCalled());
    const popupHandle = await vi.mocked(mock.api.ui.registerPersistentPopup).mock.results[0].value as any;
    popupHandle.isOpen = true;
    vi.useFakeTimers();

    currentRoomId = 10001;
    mock.api.events.emit('mapMove');
    await vi.advanceTimersByTimeAsync(399);
    expect(popupHandle.setBody).not.toHaveBeenCalled();

    currentRoomId = 10276;
    mock.api.events.emit('mapMove');
    await vi.advanceTimersByTimeAsync(399);
    expect(popupHandle.setBody).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(popupHandle.setBody).toHaveBeenCalledOnce();
    const refreshedWindow = vi.mocked(popupHandle.setBody).mock.calls[0][0] as FakeElement;
    expect(refreshedWindow.text.replace(/\s+/g, ' ')).toContain('10276 0 Galezowaty pokoniunkcyjny klabart');

    cleanup();
    mock.api.events.emit('mapMove');
    await vi.advanceTimersByTimeAsync(400);
    expect(popupHandle.setBody).toHaveBeenCalledOnce();
    expect(mock.api.events.off).toHaveBeenCalledWith('mapMove', expect.any(Function));
  });

  it('persists and toggles the slain skull marker', () => {
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

    latestRow().klik('  ');
    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)?.[0].slain).toBe(true);

    const slainRow = latestRow();
    expect(slainRow.text).toContain('💀');
    expect(slainRow.segments.some((segment) => segment.text === '💀' && segment.state?.value === '#8f4a4a')).toBe(true);
    expect(slainRow.segments.some((segment) => segment.state?.value === '#484848')).toBe(true);
    slainRow.klik('💀');
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

  it('adds any manual description in the current room with poko_dodaj', () => {
    const mock = createMockApi({ room: { id: 23456, area: 11 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 11, areaName: 'Testowa kraina', rooms: [] }]) as any;
    setupPok(mock.api);

    runAlias(mock.aliases, 'poko_dodaj   Cokolwiek z dowolnym opisem  ');
    runAlias(mock.aliases, 'poko_dodaj Cokolwiek z dowolnym opisem');

    expect(storage.get<PokFinding[]>(POK_STORAGE_KEY)).toEqual([{
      roomId: 23456,
      short: 'Cokolwiek z dowolnym opisem',
      areaId: 11,
      areaName: 'Testowa kraina',
    }]);
    expect(mock.api.output.print).toHaveBeenCalledWith(
      '[poko] #1: Cokolwiek z dowolnym opisem (23456, Testowa kraina)',
    );
  });

  it('prints poko_dodaj usage when the description is missing', () => {
    const mock = createMockApi({ room: { id: 23456, area: 11 } });
    setupPok(mock.api);

    runAlias(mock.aliases, 'poko_dodaj');

    expect(storage.get(POK_STORAGE_KEY)).toBeNull();
    expect(mock.api.output.print).toHaveBeenCalledWith('[poko] Uzycie: poko_dodaj <opis>');
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
