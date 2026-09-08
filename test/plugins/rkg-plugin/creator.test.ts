import { setupKreator } from '../../../src/plugins/rkg-plugin/creator';
import { utworzBaze } from '../../../src/plugins/rkg-plugin/store';
import { createRkgStyles } from '../../../src/plugins/rkg-plugin/styles';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { destroy, init } from '../../../src/plugins/rkg-plugin';
import { createMockApi, MockAnsiAwareBuffer, runLine } from '../../helpers/mockApi';
import type { WpisLokalny } from '../../../src/shared/rkg-api';
import { storage } from '../../../src/lib/storage';
import { RKG_PRZYMIOTNIKI } from '../../../src/plugins/rkg-plugin/data/adjectives';
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
function przejdzCalyDialog(
  mock: Mock,
  opcje: { pluraleTantum?: boolean; plecNarzucona?: boolean; postacZenska?: boolean; packed?: boolean; mixed?: boolean } = {},
) {
  const feed = (...lines: string[]) => {
    if (opcje.plecNarzucona) {
      lines = lines.map((line) => line
        .replace(/Loza/g, opcje.postacZenska ? 'Siostrzenstwo' : 'Braterstwo')
        .replace(/Lozy/g, opcje.postacZenska ? 'Siostrzenstwa' : 'Braterstwa'));
    }
    podaj(mock, ...(opcje.packed ? [lines.join('\n')] : lines));
  };
  odpal(mock, 'rkg!');
  feed('Jaki charakter ma miec klub? Jawny czy niejawny?');
  const typ = opcje.plecNarzucona ? (opcje.postacZenska ? 'siostrzenstwo' : 'braterstwo') : 'loza';
  feed('Jakiego typu ma to byc klub? Do wyboru masz:', `\t* ${typ}`);
  if (opcje.plecNarzucona) {
    // A gender-locked type (braterstwo): the game states the restriction and
    // never asks about plec.
    feed(
      `Ten typ pozwala na przyjmowanie wylacznie ${opcje.postacZenska ? 'kobiet' : 'mezczyzn'}.`,
      '',
      'Jaka ma byc nazwa klubu? Utworzona od twojego imienia czy nazwa wlasna?',
    );
  } else {
    feed(
      `Jakiej plci maja byc czlonkowie klubu? Dowolnej czy wylacznie ${opcje.postacZenska ? 'zenskiej' : 'meskiej'}?`,
    );
    feed(
      `Jaka ma byc nazwa klubu? Utworzona od twojego imienia czy nazwa wlasna? Jesli nazwiesz klub od twojego imienia, to nie bedziesz ${opcje.postacZenska ? 'mogla' : 'mogl'} przekazac wladzy nad nim nikomu innemu.`,
    );
  }
  // Noun: answered directly from the static base, single round-trip.
  feed('Podaj rzeczownik lub wyswietl dopuszczone do uzytku z jednej z kategorii:', '\t* bronie', '\t* ryby');
  feed('Podaj przymiotnik, ktory ma okreslac wybrany rzeczownik.');
  // A plurale tantum noun (e.g. 'wrota') makes the game skip the liczba question.
  if (!opcje.pluraleTantum) {
    feed('Nazwa klubu ma byc w liczbie pojedynczej czy mnogiej?');
  }
  feed('W jakim przypadku gramatycznym ma byc nazwa wlasna klubu? Mianowniku czy dopelniaczu?');
  if (opcje.postacZenska) {
    feed('Wybierz tytul dla przywodczyni:', '\t* przywodczyni', '\t* starsza');
    feed(opcje.mixed ? 'Wybierz tytul dla zastepcy przywodczyni:' : 'Wybierz tytul dla zastepczyni przywodczyni:', '\t* zaufana', '\t* druga');
    feed('Wybierz tytul dla szeregowej czlonkini klubu:', '\t* uczestniczka', '\t* siostra');
  } else {
    feed('Wybierz tytul dla przywodcy:', '\t* przywodca', '\t* starszy');
    feed('Wybierz tytul dla zastepcy przywodcy:', '\t* zaufany', '\t* drugi');
    feed('Wybierz tytul dla szeregowego czlonka klubu:', '\t* uczestnik', '\t* brat');
  }
  feed('Wybierz gest charakterystyczny dla klubu:', '\t* gleboki uklon');
  feed('Wybierz symbol klubu. Moze to byc zbroja...');
  // The summary block, then the confirmation prompt.
  feed(
    'Podsumowujac, nowy klub bedzie sie nazywal:',
    '\tLoza Maluskich Korbaczy',
    '',
    'Bedzie to klub jawny, a jego czlonkowie beda dowolnej plci.',
    '',
    opcje.postacZenska ? 'Przywodczyni bedzie nosila tytul:' : 'Przywodca bedzie nosil tytul:',
    opcje.postacZenska ? '\tPrzywodczyni Lozy Maluskich Korbaczy' : '\tPrzywodca Lozy Maluskich Korbaczy',
    '',
    opcje.mixed ? 'Zastepca przywodczyni bedzie nosil tytul:' : opcje.postacZenska ? 'Zastepczyni przywodczyni bedzie nosila tytul:' : 'Zastepca przywodcy bedzie nosil tytul:',
    opcje.postacZenska ? '\tZaufana w Lozy Maluskich Korbaczy' : '\tZaufany w Lozy Maluskich Korbaczy',
    '',
    opcje.postacZenska ? 'Szeregowa czlonkini klubu bedzie nosila tytul:' : 'Szeregowy czlonek klubu bedzie nosil tytul:',
    opcje.postacZenska ? '\tUczestniczka Lozy Maluskich Korbaczy' : '\tUczestnik Lozy Maluskich Korbaczy',
    '',
    'Czy chcesz stworzyc taki klub?',
  );
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
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

  it('harvests types and leadership-title menus and uses the noun seed', async () => {
    const mock = createMockApi();
    await init(mock.api);

    przejdzCalyDialog(mock);
    const cmds = wyslane(mock);

    expect(cmds[cmds.indexOf('jawny') + 1]).toBe('loza');
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
    expect(printed.some((t) => t.includes('PRZYWODCA') && t.includes('Przywodca Lozy'))).toBe(true);
    expect(mock.triggers).toHaveLength(0);
    expect(mock.oneTimeTriggers).toHaveLength(0);

    await destroy();
  });

  it('renders an aligned table and gives the club name the strongest treatment', async () => {
    const mock = createMockApi();
    await init(mock.api);

    przejdzCalyDialog(mock);
    const rows: MockAnsiAwareBuffer[] = (mock.api.output.print as any).mock.calls
      .map(([value]: [unknown]) => value)
      .filter((value: unknown): value is MockAnsiAwareBuffer =>
        value instanceof MockAnsiAwareBuffer && value.text.includes('│ '),
      );

    expect(rows.map((row) => row.text.indexOf('│'))).toEqual([17, 17, 17, 17]);
    expect(rows[0].text).toContain('KLUB       │ Loza Maluskich Korbaczy');
    expect(rows[0].segments[rows[0].segments.length - 1]?.state).toMatchObject({ bold: true });
    expect(rows.slice(1).every((row) =>
      row.segments[row.segments.length - 1]?.state?.bold !== true,
    )).toBe(true);

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

  it('handles a gender-locked type where the game skips the plec question', async () => {
    const mock = createMockApi();
    await init(mock.api);

    przejdzCalyDialog(mock, { plecNarzucona: true });

    const cmds = wyslane(mock);
    // It recovered: reached the summary and cancelled, never stalled.
    expect(cmds[cmds.length - 1]).toBe('**');
    expect(cmds).not.toContain('dowolnej'); // never answered a question not asked
    expect(cmds).toContain('nazwa');
    expect(mock.triggers).toHaveLength(0);
    expect(mock.oneTimeTriggers).toHaveLength(0);
    expect(wydrukowane(mock).some((t) => t.includes('przerwano'))).toBe(false);

    const wpisy = storage.get<WpisLokalny[]>('rkg:wpisy') ?? [];
    expect(wpisy).toHaveLength(1);
    // The restriction the game stated is recorded instead of our default.
    expect(wpisy[0].plec).toBe('meskiej');

    await destroy();
  });

  it('walks the female-character dialogue and captures feminine role titles', async () => {
    const mock = createMockApi();
    await init(mock.api);

    przejdzCalyDialog(mock, { postacZenska: true });

    const cmds = wyslane(mock);
    expect(['przywodczyni', 'starsza']).toContain(
      cmds.find((c) => c === 'przywodczyni' || c === 'starsza'),
    );
    expect(['zaufana', 'druga']).toContain(cmds.find((c) => c === 'zaufana' || c === 'druga'));
    expect(['uczestniczka', 'siostra']).toContain(
      cmds.find((c) => c === 'uczestniczka' || c === 'siostra'),
    );
    expect(cmds[cmds.length - 1]).toBe('**');
    expect(cmds).not.toContain('tak');
    expect(cmds).not.toContain('braterstwo');
    expect(wydrukowane(mock).some((t) => t.includes('przerwano'))).toBe(false);

    const wpisy = storage.get<WpisLokalny[]>('rkg:wpisy') ?? [];
    expect(wpisy).toHaveLength(1);
    expect(wpisy[0].role).toEqual({
      przywodca: 'Przywodczyni Lozy Maluskich Korbaczy',
      zastepca: 'Zaufana w Lozy Maluskich Korbaczy',
      czlonek: 'Uczestniczka Lozy Maluskich Korbaczy',
    });

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

  it('announces the club and offers what to do with it', async () => {
    const mock = createMockApi();
    await init(mock.api);

    przejdzCalyDialog(mock);
    const out = wydrukowane(mock).join('\n');

    expect(out).toContain('WYLOSOWANY KLUB');
    expect(out).toContain('Loza Maluskich Korbaczy');
    expect(out).toContain('KLUB       │ Loza Maluskich Korbaczy');
    expect(out).toContain('PRZYWODCA  │ Przywodca Lozy Maluskich Korbaczy');
    expect(out).toContain('WYBIERZ AKCJE');
    expect(out).toContain('wyslij do rankingu');
    expect(out).toContain('nie wysylaj');
    expect(out).toContain('otworz okno lokalnych');
    expect(out).toContain('ranking  https://');

    await destroy();
  });

  it('still records the club when the offer cannot be rendered', async () => {
    const mock = createMockApi();
    // A client that chokes on the clickable line must not take the run with it.
    (mock.api.output.print as any).mockImplementation((arg: any) => {
      if (String(arg?.text ?? arg).includes('WYBIERZ AKCJE')) throw new Error('brak linkow');
    });
    await init(mock.api);

    przejdzCalyDialog(mock);

    // The run completed normally: cancelled the dialogue and stored the club.
    expect(wyslane(mock)[wyslane(mock).length - 1]).toBe('**');
    expect(storage.get<WpisLokalny[]>('rkg:wpisy') ?? []).toHaveLength(1);

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

function doRzeczownika(mock: Mock) {
  odpal(mock, 'rkg!');
  podaj(mock, 'Jaki charakter ma miec klub?');
  podaj(mock, 'Jakiego typu ma to byc klub?\t* loza');
  podaj(mock, 'Jakiej plci maja byc czlonkowie klubu?');
  podaj(mock, 'Jaka ma byc nazwa klubu?');
}

function doTytulow(mock: Mock) {
  doRzeczownika(mock);
  podaj(mock, 'Podaj rzeczownik lub wyswietl');
  podaj(mock, 'Podaj przymiotnik');
  podaj(mock, 'W jakim przypadku gramatycznym');
}

function posprzatane(mock: Mock) {
  expect(mock.triggers).toHaveLength(0);
  expect(mock.oneTimeTriggers).toHaveLength(0);
  expect(mock.tokenTriggers).toHaveLength(0);
  expect(vi.getTimerCount()).toBe(0);
  expect(wyslane(mock)).not.toContain('tak');
}

function przerwane(mock: Mock, menu: string) {
  expect(wyslane(mock)[wyslane(mock).length - 1]).toBe('**');
  expect(wydrukowane(mock).join('\n')).toContain(`[rkg] przerwano: ${menu}`);
  expect(storage.get<WpisLokalny[]>('rkg:wpisy') ?? []).toHaveLength(0);
  posprzatane(mock);
}

describe('live menus and rejection recovery', () => {
  // Isolate creator timers from the unrelated ranking-window countdown.
  let stopCreator: () => void;
  const initCreator = async (mock: Mock) => {
    stopCreator = setupKreator(mock.api, utworzBaze(), createRkgStyles(mock.api));
  };
  afterEach(() => stopCreator?.());

  it.each([false, true])('completes packed female output, mixed grammar: %s', async (mixed) => {
    const mock = createMockApi();
    await initCreator(mock);
    przejdzCalyDialog(mock, { postacZenska: true, packed: true, mixed });
    expect(storage.get<WpisLokalny[]>('rkg:wpisy')?.[0].role).toEqual({
      przywodca: 'Przywodczyni Lozy Maluskich Korbaczy',
      zastepca: 'Zaufana w Lozy Maluskich Korbaczy',
      czlonek: 'Uczestniczka Lozy Maluskich Korbaczy',
    });
    expect(wyslane(mock)[wyslane(mock).length - 1]).toBe('**');
    posprzatane(mock);
    stopCreator();
  });

  it('records a female gender-locked type', async () => {
    const mock = createMockApi();
    await initCreator(mock);
    przejdzCalyDialog(mock, { postacZenska: true, plecNarzucona: true });
    expect(storage.get<WpisLokalny[]>('rkg:wpisy')?.[0]).toMatchObject({
      typ: 'siostrzenstwo', plec: 'zenskiej',
    });
    expect(wyslane(mock)).not.toContain('braterstwo');
    posprzatane(mock);
    stopCreator();
  });

  it.each(['separate', 'newline', 'tabs'])('uses independent male/female type menus (%s)', async (format) => {
    const mock = createMockApi();
    await initCreator(mock);
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    for (const typ of ['braterstwo', 'siostrzenstwo', 'braterstwo']) {
      odpal(mock, 'rkg!');
      podaj(mock, 'Jaki charakter ma miec klub?');
      const lines = ['Jakiego typu ma to byc klub?', '\t* spolka handlowa', `\t* ${typ}`, '\t**', 'Wpisz ** aby przerwac.'];
      podaj(mock, ...(format === 'separate' ? lines : [lines.join(format === 'tabs' ? '\t' : '\n')]));
      expect(wyslane(mock)[wyslane(mock).length - 1]).toBe(typ);
      odpal(mock, 'rkg-');
      posprzatane(mock);
    }
    stopCreator();
  });

  it.each([
    ['Wybierz tytul dla przywodcy:', 'tytul przywodcy', 0],
    ['Wybierz tytul dla przywodczyni:', 'tytul przywodcy', 0],
    ['Wybierz tytul dla zastepcy przywodczyni:', 'tytul zastepcy', 1],
    ['Wybierz tytul dla szeregowej czlonkini:', 'tytul czlonka', 2],
  ] as const)('aborts an unparsable menu: %s', async (prompt, label, step) => {
    const mock = createMockApi();
    await initCreator(mock);
    doTytulow(mock);
    if (step > 0) podaj(mock, 'Wybierz tytul dla przywodczyni:\t* starsza');
    if (step > 1) podaj(mock, 'Wybierz tytul dla zastepczyni przywodczyni:\t* druga');
    const count = wyslane(mock).length;
    podaj(mock, prompt, '\t**', 'Aby przerwac wpisz **.', '\t* wpisz ** aby przerwac');
    expect(wyslane(mock).slice(count)).toEqual(['**']);
    przerwane(mock, label);
    stopCreator();
  });

  it('aborts an empty type menu', async () => {
    const mock = createMockApi();
    await initCreator(mock);
    odpal(mock, 'rkg!');
    podaj(mock, 'Jaki charakter ma miec klub?');
    podaj(mock, 'Jakiego typu ma to byc klub?');
    przerwane(mock, 'typ klubu');
    stopCreator();
  });

  it.each(['rzeczownik', 'przymiotnik'])('retries a rejected %s and accepts the next prompt', async (kind) => {
    const mock = createMockApi();
    await initCreator(mock);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    doRzeczownika(mock);
    if (kind === 'przymiotnik') podaj(mock, 'Podaj rzeczownik lub wyswietl');
    const prompt = kind === 'rzeczownik' ? 'Podaj rzeczownik lub wyswietl' : 'Podaj przymiotnik';
    podaj(mock, prompt);
    const first = wyslane(mock)[wyslane(mock).length - 1];
    podaj(mock, 'Nie ma takiego slowa.', prompt);
    const second = wyslane(mock)[wyslane(mock).length - 1];
    expect(second).not.toBe(first);
    expect(kind === 'rzeczownik' ? RZECZOWNIKI_SEED : RKG_PRZYMIOTNIKI).toContain(second);
    podaj(mock, kind === 'rzeczownik' ? 'Podaj przymiotnik' : 'W jakim przypadku gramatycznym');
    expect(wyslane(mock)[wyslane(mock).length - 1]).not.toBe(second);
    expect(wydrukowane(mock).join('\n')).not.toContain('przerwano');
    odpal(mock, 'rkg-');
    posprzatane(mock);
    stopCreator();
  });

  it.each(['rzeczownik', 'przymiotnik'])('bounds repeated %s rejections and cleans up', async (kind) => {
    const mock = createMockApi();
    await initCreator(mock);
    doRzeczownika(mock);
    if (kind === 'przymiotnik') podaj(mock, 'Podaj rzeczownik lub wyswietl');
    const count = wyslane(mock).length;
    for (let i = 0; i < 6; i++) podaj(mock, kind === 'rzeczownik' ? 'Podaj rzeczownik lub wyswietl' : 'Podaj przymiotnik');
    const answers = wyslane(mock).slice(count, -1);
    expect(answers).toHaveLength(5);
    expect(new Set(answers).size).toBe(5);
    przerwane(mock, kind);
    vi.advanceTimersByTime(30000);
    expect(wyslane(mock).slice(count, -1)).toEqual(answers);
    stopCreator();
  });

  it.each(['typ', 'tytul'])('reharvests a rejected %s menu and exhausts unused choices', async (kind) => {
    const mock = createMockApi();
    await initCreator(mock);
    if (kind === 'tytul') doTytulow(mock);
    else {
      odpal(mock, 'rkg!');
      podaj(mock, 'Jaki charakter ma miec klub?');
    }
    const prompt = kind === 'typ' ? 'Jakiego typu ma to byc klub?' : 'Wybierz tytul dla przywodczyni:';
    podaj(mock, `${prompt}\t* pierwsza`);
    expect(wyslane(mock)[wyslane(mock).length - 1]).toBe('pierwsza');
    // A fresh menu replaces the old one, while attempt history survives.
    podaj(mock, prompt, '\t* druga', '\t* druga');
    expect(wyslane(mock)[wyslane(mock).length - 1]).toBe('druga');
    podaj(mock, `${prompt}\t* pierwsza\t* druga`);
    przerwane(mock, kind === 'typ' ? 'typ klubu' : 'tytul przywodcy');
    stopCreator();
  });

  it.each(['rkg-', 'destroy'])('clears a pending answer timer on %s and permits a fresh run', async (action) => {
    const mock = createMockApi();
    await initCreator(mock);
    odpal(mock, 'rkg!');
    runLine(mock, 'Jaki charakter ma miec klub?');
    if (action === 'destroy') stopCreator();
    else odpal(mock, action);
    posprzatane(mock);
    const count = wyslane(mock).length;
    vi.advanceTimersByTime(30000);
    expect(wyslane(mock)).toHaveLength(count);
    if (action !== 'destroy') {
      przejdzCalyDialog(mock);
      posprzatane(mock);
      stopCreator();
    }
  });

  it('cancels immediately when a fixed answer is rejected', async () => {
    const mock = createMockApi();
    await initCreator(mock);
    odpal(mock, 'rkg!');
    podaj(mock, 'Jaki charakter ma miec klub?');
    podaj(mock, 'Jaki charakter ma miec klub?');
    przerwane(mock, 'odrzucona odpowiedz');
    stopCreator();
  });
});
