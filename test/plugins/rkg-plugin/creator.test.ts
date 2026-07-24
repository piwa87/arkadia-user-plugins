import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { destroy, init } from '../../../src/plugins/rkg-plugin';
import { createMockApi, MockAnsiAwareBuffer, runLine } from '../../helpers/mockApi';
import type { WpisLokalny } from '../../../src/shared/rkg-api';
import { storage } from '../../../src/lib/storage';
import { RKG_TYPY } from '../../../src/plugins/rkg-plugin/data/types';
import { RZECZOWNIKI_SEED } from '../../../src/plugins/rkg-plugin/data/seed';

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  };
}

type Mock = ReturnType<typeof createMockApi>;

function odpal(mock: Mock, wejscie: string) {
  const alias = mock.aliases.find((a) => a.pattern.test(wejscie));
  expect(alias, `brak aliasu: ${wejscie}`).toBeDefined();
  alias!.callback(wejscie.match(alias!.pattern) as RegExpMatchArray);
}

function wyslane(mock: Mock): string[] {
  return (mock.api.command.send as any).mock.calls.map(([cmd]: [string]) => cmd);
}

function wydrukowane(mock: Mock): string[] {
  return (mock.api.output.print as any).mock.calls.map(([a]: [unknown]) =>
    a instanceof MockAnsiAwareBuffer ? a.text : String(a),
  );
}

/** Feed several output lines, then let the step's randomized delay elapse. */
function podaj(mock: Mock, ...linie: string[]) {
  for (const l of linie) runLine(mock, l);
  vi.advanceTimersByTime(1000);
}

/**
 * Drive a full `utworz klub` walkthrough, transcript-faithful (including the
 * `* option` menus and the multi-line summary), ending at the confirmation.
 */
function przejdzCalyDialog(mock: Mock, opcje: { pluraleTantum?: boolean } = {}) {
  odpal(mock, 'rkg!');
  podaj(mock, 'Jaki charakter ma miec klub? Jawny czy niejawny?');
  // Type is answered from the static list; the menu bullets are ignored.
  podaj(mock, 'Jakiego typu ma to byc klub? Do wyboru masz:', '\t* banda', '\t* loza', '\t* liga');
  podaj(mock, 'Jakiej plci maja byc czlonkowie klubu? Dowolnej czy wylacznie meskiej?');
  podaj(mock, 'Jaka ma byc nazwa klubu? Utworzona od twojego imienia czy nazwa wlasna?');
  // Noun: answered directly from the static base, single round-trip.
  podaj(mock, 'Podaj rzeczownik lub wyswietl dopuszczone do uzytku z jednej z kategorii:', '\t* bronie', '\t* ryby');
  podaj(mock, 'Podaj przymiotnik, ktory ma okreslac wybrany rzeczownik.');
  // A plurale tantum noun (e.g. 'wrota') makes the game skip the liczba question.
  if (!opcje.pluraleTantum) {
    podaj(mock, 'Nazwa klubu ma byc w liczbie pojedynczej czy mnogiej?');
  }
  podaj(mock, 'W jakim przypadku gramatycznym ma byc nazwa wlasna klubu? Mianowniku czy dopelniaczu?');
  podaj(mock, 'Wybierz tytul dla przywodcy:', '\t* przywodca', '\t* starszy');
  podaj(mock, 'Wybierz tytul dla zastepcy przywodcy:', '\t* zaufany', '\t* drugi');
  podaj(mock, 'Wybierz tytul dla szeregowego czlonka klubu:', '\t* uczestnik', '\t* brat');
  podaj(mock, 'Wybierz gest charakterystyczny dla klubu:', '\t* gleboki uklon');
  podaj(mock, 'Wybierz symbol klubu. Moze to byc zbroja...');
  // The summary block, then the confirmation prompt.
  podaj(
    mock,
    'Podsumowujac, nowy klub bedzie sie nazywal:',
    '\tLoza Maluskich Korbaczy',
    '',
    'Bedzie to klub jawny, a jego czlonkowie beda dowolnej plci.',
    '',
    'Przywodca bedzie nosil tytul:',
    '\tPrzywodca Lozy Maluskich Korbaczy',
    '',
    'Zastepca przywodcy bedzie nosil tytul:',
    '\tZaufany w Lozy Maluskich Korbaczy',
    '',
    'Szeregowy czlonek klubu bedzie nosil tytul:',
    '\tUczestnik Lozy Maluskich Korbaczy',
    '',
    'Czy chcesz stworzyc taki klub?',
  );
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('rkg! creation dialogue', () => {
  it('walks the whole dialogue, harvests menus, then cancels', async () => {
    const mock = createMockApi();
    await init(mock.api);

    przejdzCalyDialog(mock);
    const cmds = wyslane(mock);

    expect(cmds[0]).toBe('utworz klub');
    expect(cmds).toContain('jawny');
    expect(cmds).toContain('dowolnej');
    expect(cmds).toContain('nazwa');
    // Both `pomin` skips (gest, symbol).
    expect(cmds.filter((c) => c === 'pomin')).toHaveLength(2);
    // Preview only: the run ends by cancelling and never confirms.
    expect(cmds[cmds.length - 1]).toBe('**');
    expect(cmds).not.toContain('tak');

    await destroy();
  });

  it('harvests the leadership-title menus and answers the rest statically', async () => {
    const mock = createMockApi();
    await init(mock.api);

    przejdzCalyDialog(mock);
    const cmds = wyslane(mock);

    // Type is answered from the static list.
    expect(RKG_TYPY).toContain(cmds[cmds.indexOf('jawny') + 1]);
    // Noun is answered from the static base.
    expect(RZECZOWNIKI_SEED).toContain(cmds[cmds.indexOf('nazwa') + 1]);
    // The three leadership titles were sent from their harvested menus.
    expect(['przywodca', 'starszy']).toContain(cmds.find((c) => c === 'przywodca' || c === 'starszy'));
    expect(['zaufany', 'drugi']).toContain(cmds.find((c) => c === 'zaufany' || c === 'drugi'));
    expect(['uczestnik', 'brat']).toContain(cmds.find((c) => c === 'uczestnik' || c === 'brat'));

    await destroy();
  });

  it('records the full club object — name and all three role titles', async () => {
    const mock = createMockApi();
    await init(mock.api);

    przejdzCalyDialog(mock);

    const wpisy = storage.get<WpisLokalny[]>('rkg:wpisy') ?? [];
    expect(wpisy).toHaveLength(1);
    const w = wpisy[0];
    expect(w.wynik).toBe('Loza Maluskich Korbaczy');
    expect(w.charakter).toBe('jawny');
    expect(w.plec).toBe('dowolnej');
    expect(w.role.przywodca).toBe('Przywodca Lozy Maluskich Korbaczy');
    expect(w.role.zastepca).toBe('Zaufany w Lozy Maluskich Korbaczy');
    expect(w.role.czlonek).toBe('Uczestnik Lozy Maluskich Korbaczy');
    // The seed we sent is kept alongside the inflected result.
    expect(w.rzeczownik).toBeTruthy();
    expect(RZECZOWNIKI_SEED).toContain(w.rzeczownik);
    expect(w.przymiotnik).toBeTruthy();

    await destroy();
  });

  it('prints the captured name and the roles, leaving no armed trigger', async () => {
    const mock = createMockApi();
    await init(mock.api);

    przejdzCalyDialog(mock);
    const printed = wydrukowane(mock);

    expect(printed.some((t) => t.includes('Loza Maluskich Korbaczy'))).toBe(true);
    expect(printed.some((t) => t.includes('przywodca:') && t.includes('Przywodca Lozy'))).toBe(true);
    expect(mock.triggers).toHaveLength(0);
    expect(mock.oneTimeTriggers).toHaveLength(0);

    await destroy();
  });

  it('handles a plurale tantum noun where the game skips the liczba question', async () => {
    const mock = createMockApi();
    await init(mock.api);

    // Same walk, but the game jumps from adjective straight to przypadek.
    przejdzCalyDialog(mock, { pluraleTantum: true });

    const cmds = wyslane(mock);
    // It recovered: reached the summary and cancelled, never stalled.
    expect(cmds[cmds.length - 1]).toBe('**');
    expect(mock.triggers).toHaveLength(0);
    expect(mock.oneTimeTriggers).toHaveLength(0);

    const wpisy = storage.get<WpisLokalny[]>('rkg:wpisy') ?? [];
    expect(wpisy).toHaveLength(1);
    // The name is recorded as plural, since liczba was never offered.
    expect(wpisy[0].liczba).toBe('mnogiej');

    await destroy();
  });

  it('only sends the next answer once its prompt arrives', async () => {
    const mock = createMockApi();
    await init(mock.api);

    odpal(mock, 'rkg!');
    expect(wyslane(mock)).toEqual(['utworz klub']);

    runLine(mock, 'Jaki charakter ma miec klub? Jawny czy niejawny?');
    expect(wyslane(mock)).toEqual(['utworz klub']); // still delayed
    vi.advanceTimersByTime(1000);
    expect(wyslane(mock)).toContain('jawny');

    await destroy();
  });

  it('rkg- aborts mid-run, cancels the dialogue and records nothing', async () => {
    const mock = createMockApi();
    await init(mock.api);

    odpal(mock, 'rkg!');
    podaj(mock, 'Jaki charakter ma miec klub? Jawny czy niejawny?');

    odpal(mock, 'rkg-');

    expect(wyslane(mock)[wyslane(mock).length - 1]).toBe('**');
    expect(mock.triggers).toHaveLength(0);
    expect(mock.oneTimeTriggers).toHaveLength(0);
    expect(storage.get<WpisLokalny[]>('rkg:wpisy') ?? []).toHaveLength(0);

    await destroy();
  });

  it('watchdog aborts when a prompt never arrives', async () => {
    const mock = createMockApi();
    await init(mock.api);

    odpal(mock, 'rkg!');
    podaj(mock, 'Jaki charakter ma miec klub? Jawny czy niejawny?'); // sends jawny, arms typ
    vi.advanceTimersByTime(16000); // typ prompt never comes

    const printed = wydrukowane(mock);
    expect(printed.some((t) => t.includes('przerwano'))).toBe(true);
    expect(mock.oneTimeTriggers).toHaveLength(0);
    expect(mock.triggers).toHaveLength(0);

    await destroy();
  });

  it('refuses to start a second run while one is active', async () => {
    const mock = createMockApi();
    await init(mock.api);

    odpal(mock, 'rkg!');
    (mock.api.output.print as any).mockClear();
    odpal(mock, 'rkg!');

    expect(wydrukowane(mock).some((t) => t.includes('juz trwa'))).toBe(true);

    await destroy();
  });
});
