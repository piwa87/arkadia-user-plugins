import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupBrokilon } from '../../../src/plugins/core-plugin/brokilon';
import { getMyColor } from '../../../src/lib/colors/my-colors';
import { getAnsiFormatState } from '../../../src/lib/colors/my-ansi-colors';
import {
  createMockApi,
  MockAnsiAwareBuffer,
  runLine,
  type MockApi,
} from '../../helpers/mockApi';

function setup(): MockApi & { cleanup: () => void } {
  const mock = createMockApi();
  const cleanup = setupBrokilon(mock.api);
  runAlias(mock, 'brok+');
  (mock.api.output.print as any).mockClear();
  (mock.api.command.send as any).mockClear();
  return { ...mock, cleanup };
}

function sentCommands(mock: MockApi): string[] {
  return (mock.api.command.send as any).mock.calls.map(([command]: [string]) => command);
}

function printedTexts(mock: MockApi): string[] {
  return (mock.api.output.print as any).mock.calls.map(([value]: [unknown]) =>
    value instanceof MockAnsiAwareBuffer ? value.text : String(value),
  );
}

function runAlias(mock: MockApi, command: string): void {
  const alias = mock.aliases.find((entry) => entry.pattern.test(command));
  expect(alias, `missing alias for ${command}`).toBeDefined();
  alias!.callback(command.match(alias!.pattern) as RegExpMatchArray);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Brokilon module toggle', () => {
  it('defaults to disabled: triggers and aliases are inert', () => {
    const mock = createMockApi();
    setupBrokilon(mock.api);

    const line = runLine(mock, 'Zamkniety zloty grobowiec.');
    expect(line!.color).not.toHaveBeenCalled();
    expect(mock.api.bind.set).not.toHaveBeenCalled();

    runAlias(mock, 'ql');
    expect(sentCommands(mock)).toEqual([]);
  });

  it('brok+ enables the module and brok- disables it again', () => {
    const mock = createMockApi();
    setupBrokilon(mock.api);

    runAlias(mock, 'brok+');
    runAlias(mock, 'ql');
    expect(sentCommands(mock)).toEqual(['ob grobowiec']);

    runAlias(mock, 'brok-');
    runAlias(mock, 'ql');
    expect(sentCommands(mock)).toEqual(['ob grobowiec']);
  });
});

describe('Brokilon triggers', () => {
  it('colors a closed golden tomb and arms the functional bind', () => {
    const mock = setup();

    const line = runLine(mock, 'Zamkniety zloty grobowiec.');

    expect(line!.color).toHaveBeenCalledTimes(1);
    expect(mock.api.bind.set).toHaveBeenCalledWith(
      'otworz grobowiec;przeszukaj grobowiec',
      undefined,
      undefined,
    );
  });

  it.each([
    'Aldaron znajduje jakis niewielki przedmiot w grobowcu.',
    'Znajdujesz w niej metalowy kluczyk pokryty patyna.',
    'Znajdujesz w niej metalowy kluczyk!',
    'Zutzer znajduje metalowy kluczyk!',
  ])('announces a key for: %s', (text) => {
    const mock = setup();

    runLine(mock, text);

    const frame = printedTexts(mock).filter(Boolean);
    expect(frame).toHaveLength(4);
    expect(frame[0]).toMatch(/^┌─+┐$/);
    expect(frame[1]).toContain('KLUCZYK!');
    expect(frame[1]).toContain(text.startsWith('Znajdujesz') ? 'ZNALAZLES' : `Znalazca: ${text.split(' ')[0]}`);
    expect(frame[2]).toContain('Brak aktywnego odliczania.');
    expect(frame[3]).toMatch(/^└─+┘$/);
    expect(new Set(frame.map((row) => row.length)).size).toBe(1);
    expect(mock.api.bind.set).toHaveBeenCalledExactlyOnceWith('take', undefined, undefined);
    expect(sentCommands(mock)).toEqual([]);
  });

  it('reports the actual remaining time when a key is found, even before a delayed timer tick', () => {
    vi.useFakeTimers();
    const mock = setup();
    runAlias(mock, 'broktime_test');
    vi.setSystemTime(Date.now() + 61_300);
    const colorSpy = vi.spyOn(MockAnsiAwareBuffer.prototype, 'color');

    runLine(mock, 'Znajdujesz w niej metalowy kluczyk!');

    expect(printedTexts(mock).some((text) => text.includes('Brawo, masz jeszcze 39 sekund do konca imprezy!'))).toBe(true);
    for (const [, color] of colorSpy.mock.calls) expect(color).toEqual(getMyColor(11, mock.api));
    expect(mock.api.bind.set).toHaveBeenLastCalledWith('take', undefined, undefined);
    mock.cleanup();
  });

  it('reports zero after the countdown expires, and no remaining time after brokstop', () => {
    vi.useFakeTimers();
    const mock = setup();
    runAlias(mock, 'broktime_test');
    vi.advanceTimersByTime(103_000);
    runLine(mock, 'Soroko znajduje jakis niewielki przedmiot.');
    expect(printedTexts(mock).some((text) => text.includes('Brawo, masz jeszcze 0 sekund do konca imprezy!'))).toBe(true);

    runAlias(mock, 'brokstop');
    vi.mocked(mock.api.output.print).mockClear();
    runLine(mock, 'Znajdujesz w niej metalowy kluczyk!');
    expect(printedTexts(mock).some((text) => text.includes('Brak aktywnego odliczania.'))).toBe(true);
    expect(printedTexts(mock).some((text) => text.includes('Brawo'))).toBe(false);
  });

  it('does not announce a key or change the bind while Brokilon is disabled', () => {
    const mock = setup();
    runAlias(mock, 'brok-');
    vi.mocked(mock.api.output.print).mockClear();
    runLine(mock, 'Znajdujesz w niej metalowy kluczyk!');
    expect(printedTexts(mock)).toEqual([]);
    expect(mock.api.bind.set).not.toHaveBeenCalled();
  });

  it('announces a hanging victim three times and plays basso', () => {
    const mock = setup();

    runLine(
      mock,
      'Nagle elf podlatuje w gore, robi pol salta i zawisa bezwladnie, przywiazany do drzewa, by dyndac jak kukielka.',
    );

    expect(printedTexts(mock)).toEqual(Array(3).fill('          ktos zawisl          '));
    expect(sentCommands(mock)).toEqual(['play_basso']);
  });

  it.each(['Isserath', 'Galiaar', 'Rzemienna petla'])('colors lines mentioning %s', (name) => {
    const mock = setup();
    const line = runLine(mock, `Na ziemi lezy ${name}.`);
    expect(line!.color).toHaveBeenCalledTimes(1);
  });

  it.each(['', '[ PULAPKA ]  '])('announces being caught three times and plays basso (prefix: %s)', (prefix) => {
    const mock = setup();
    const text = `${prefix}Nagle czujesz, ze cos oplata twa noge... ziemia w zawrotnym tempie zamienia sie miejscami z niebem. Zwisasz teraz, przywiazany za noge rzemieniem, dyndajac jak kukielka.`;

    const line = runLine(mock, text);

    expect(line?.text).toBe(text.slice(prefix.length));
    expect(printedTexts(mock)).toEqual(Array(3).fill('          pulapka lapie mnie          '));
    expect(sentCommands(mock)).toEqual(['play_basso']);
  });

  it('does not announce being caught while Brokilon is disabled', () => {
    const mock = setup();
    runAlias(mock, 'brok-');
    const messages = printedTexts(mock);

    runLine(mock, 'Nagle czujesz, ze cos oplata twa noge... ziemia w zawrotnym tempie zamienia sie miejscami z niebem. Zwisasz teraz, przywiazany za noge rzemieniem, dyndajac jak kukielka.');

    expect(printedTexts(mock)).toEqual(messages);
    expect(sentCommands(mock)).toEqual([]);
  });

  it.each([true, false])('overrides only the client trap appearance when enabled: %s', (enabled) => {
    const mock = setup();
    if (!enabled) runAlias(mock, 'brok-');
    const messages = printedTexts(mock);
    const text = 'Nagle czujesz, ze cos oplata twa noge... ziemia w zawrotnym tempie zamienia sie miejscami z niebem. Zwisasz teraz, przywiazany za noge rzemieniem, dyndajac jak kukielka.';
    const moveBack = vi.fn();
    const clientColor = getMyColor(6, mock.api);
    const colorSpy = vi.spyOn(MockAnsiAwareBuffer.prototype, 'color');
    // Simulate the client's regular trigger before the plugin's token trigger.
    mock.api.triggers.register('Nagle czujesz', (line) => {
      moveBack();
      mock.api.bind.set('przetnij rzemien');
      return new mock.api.AnsiAwareBuffer(`[ PULAPKA ]  ${line.text}`).color(
        [0, line.text.length + 13], clientColor,
      );
    }, 'client-trap');

    const line = runLine(mock, text);

    expect(moveBack).toHaveBeenCalledOnce();
    expect(mock.api.bind.set).toHaveBeenCalledExactlyOnceWith('przetnij rzemien');
    expect(line?.text).toBe(enabled ? text : `[ PULAPKA ]  ${text}`);
    expect(colorSpy).toHaveBeenLastCalledWith(
      [0, line!.text.length], enabled ? getAnsiFormatState(37, mock.api) : clientColor,
    );
    expect(printedTexts(mock)).toEqual(enabled
      ? [...messages, ...Array(3).fill('          pulapka lapie mnie          ')]
      : messages);
    expect(sentCommands(mock)).toEqual(enabled ? ['play_basso'] : []);
  });

  it.each([
    'Nagle jakas strzala wbija sie Zutzerowi w nogi.',
    'Nagle jakas strzala wbija ci sie w korpus.',
    'Nadlatujaca ze swistem strzala wbija ci sie w korpus.',
    'W ziemie wbila sie z niesamowita predkoscia dluga strzala.',
  ])('replaces client arrow formatting with the local alert: %s', (text) => {
    const mock = setup();
    mock.api.triggers.register(text, (line) =>
      new mock.api.AnsiAwareBuffer(`[ STRZALY ]  ${line.text}`, getMyColor(6, mock.api)),
    'client-arrows');

    const line = runLine(mock, text) as unknown as MockAnsiAwareBuffer;

    expect(line.text).toBe(`  ***  STRZALA  ***  ${text}`);
    expect(line.segments).toEqual([
      { text: '  ***  STRZALA  ***  ', state: getAnsiFormatState(37, mock.api) },
      { text, state: undefined },
    ]);
    expect(sentCommands(mock)).toEqual(['play_tink']);
  });

  it('keeps client arrow formatting while Brokilon is disabled', () => {
    const mock = setup();
    runAlias(mock, 'brok-');
    const text = 'Nagle jakas strzala wbija sie Zutzerowi w nogi.';
    const clientLine = new mock.api.AnsiAwareBuffer(`[ STRZALY ]  ${text}`, getMyColor(6, mock.api));
    mock.api.triggers.register(text, () => clientLine, 'client-arrows');

    expect(runLine(mock, text)).toBe(clientLine);
    expect(sentCommands(mock)).toEqual([]);
  });

  it('learns a new first password and uses it through ha1', () => {
    const mock = setup();

    runLine(mock, 'Imie ich bylo Eithne, a pamiec o nich pozostala.');
    runAlias(mock, 'ha1');

    expect(sentCommands(mock)).toContain('powiedz Eithne');
    expect(printedTexts(mock)).toContain("--> Zlapalem nowe haslo: 'Eithne'");
  });

  it('counts down in the footer, warns at milestones and finishes at 100 seconds', () => {
    vi.useFakeTimers();
    const mock = setup();
    const colorSpy = vi.spyOn(MockAnsiAwareBuffer.prototype, 'color');

    runLine(mock, 'Po wlozeniu drugiego klucza wrota otwieraja sie z ciezkim zgrzytem!');

    expect(sentCommands(mock)).toEqual([]);
    expect(printedTexts(mock)).toEqual([
      '',
      '┌──────────────────────────────────────────────┐',
      '│ [Brokilon] Odliczam 100 SEKUND... Good luck! │',
      '└──────────────────────────────────────────────┘',
      '',
    ]);
    expect(colorSpy).toHaveBeenCalledTimes(3);
    for (const [range, color] of colorSpy.mock.calls) {
      expect(range).toEqual([0, 48]);
      expect(color).toEqual(getMyColor(11, mock.api));
    }
    const footer = mock.footerComponents.find(({ id }) => id === 'brokilon-timer')!;
    expect(footer.initialContent).toContain('100 s');
    expect(footer.initialContent).toContain('chip--ok');
    expect(footer.handle.setVisible).toHaveBeenLastCalledWith(true);

    vi.advanceTimersByTime(1000);
    expect(footer.handle.setContent).toHaveBeenLastCalledWith(expect.stringContaining('99 s'));
    vi.advanceTimersByTime(53_000);
    expect(footer.handle.setContent).toHaveBeenLastCalledWith(expect.stringContaining('chip--ok'));
    vi.advanceTimersByTime(1000);
    expect(footer.handle.setContent).toHaveBeenLastCalledWith(expect.stringContaining('chip--warn'));
    expect(printedTexts(mock).filter(Boolean)).toHaveLength(4);
    expect(printedTexts(mock)).toContain('[Brokilon] Zostalo 45 s!');
    expect(colorSpy).toHaveBeenLastCalledWith(expect.any(Array), getMyColor(13, mock.api));

    vi.advanceTimersByTime(14_000);
    expect(footer.handle.setContent).toHaveBeenLastCalledWith(expect.stringContaining('chip--warn'));
    vi.advanceTimersByTime(1000);
    expect(footer.handle.setContent).toHaveBeenLastCalledWith(expect.stringContaining('chip--danger'));
    expect(printedTexts(mock)).toContain('[Brokilon] Zostalo 30 s!');
    expect(colorSpy).toHaveBeenLastCalledWith(expect.any(Array), getMyColor(13, mock.api));

    vi.advanceTimersByTime(20_000);
    expect(footer.handle.setContent).toHaveBeenLastCalledWith(expect.stringContaining('chip--danger'));
    expect(printedTexts(mock)).toContain('[Brokilon] Zostalo 10 s! Moze czas wyjsc na gore?');
    expect(colorSpy).toHaveBeenLastCalledWith(expect.any(Array), getMyColor(5, mock.api));
    const lastCountdownColorCall = colorSpy.mock.calls.length;
    vi.advanceTimersByTime(10_000);
    expect(printedTexts(mock).filter(Boolean).slice(6)).toEqual([
      ...[5, 4, 3, 2, 1].map((seconds) => `[Brokilon] Zostalo ${seconds} s!`),
      '[Brokilon] 100 SEKUND minelo... zyjecie? 😆',
    ]);
    for (const [, color] of colorSpy.mock.calls.slice(lastCountdownColorCall, -1)) {
      expect(color).toEqual(getMyColor(5, mock.api));
    }
    expect(footer.handle.setContent).toHaveBeenLastCalledWith(expect.stringContaining('CZAS MINAL... zyjecie? 😆'));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('only allows a local test while brok+ is enabled', () => {
    vi.useFakeTimers();
    const mock = createMockApi();
    const cleanup = setupBrokilon(mock.api);
    runLine(mock, 'Po wlozeniu drugiego klucza wrota otwieraja sie z ciezkim zgrzytem!');
    expect(mock.footerComponents).toHaveLength(0);

    runAlias(mock, 'broktime_test');
    expect(mock.footerComponents).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(printedTexts(mock)).toEqual([]);

    runAlias(mock, 'brok+');
    runAlias(mock, 'broktime_test');
    expect(mock.footerComponents[0].initialContent).toContain('100 s');
    vi.advanceTimersByTime(1000);
    expect(mock.footerComponents[0].handle.setContent).toHaveBeenLastCalledWith(expect.stringContaining('99 s'));
    runAlias(mock, 'brok-');
    runAlias(mock, 'broktime_test');
    expect(mock.footerComponents[0].handle.setVisible).toHaveBeenLastCalledWith(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(sentCommands(mock)).toEqual([]);
    cleanup();
  });

  it.each(['broktime_test', 'gates'])('restarts an active countdown through %s without duplicating it', (source) => {
    vi.useFakeTimers();
    const mock = setup();
    runAlias(mock, 'broktime_test');
    vi.advanceTimersByTime(50_000);
    if (source === 'gates') {
      runLine(mock, 'Po wlozeniu drugiego klucza wrota otwieraja sie z ciezkim zgrzytem!');
    } else {
      runAlias(mock, 'broktime_test');
    }
    expect(mock.footerComponents).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1);
    expect(mock.footerComponents[0].handle.setContent).toHaveBeenLastCalledWith(expect.stringContaining('100 s'));
    vi.advanceTimersByTime(40_000);
    expect(mock.footerComponents[0].handle.setContent).toHaveBeenLastCalledWith(expect.stringContaining('60 s'));
    expect(printedTexts(mock).some((text) => text.includes('Zostalo'))).toBe(false);
    mock.cleanup();
  });

  it.each(['brokstop', 'brok-', 'cleanup'])('cancels updates and warnings on %s', (action) => {
    vi.useFakeTimers();
    const mock = setup();
    runAlias(mock, 'broktime_test');
    vi.advanceTimersByTime(1000);
    const footer = mock.footerComponents[0];
    if (action === 'cleanup') mock.cleanup();
    else runAlias(mock, action);
    expect(footer.handle.setVisible).toHaveBeenLastCalledWith(false);
    if (action === 'cleanup') expect(footer.handle.remove).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    const messages = printedTexts(mock);
    const updates = footer.handle.setContent.mock.calls.length;
    vi.advanceTimersByTime(100_000);
    expect(printedTexts(mock)).toEqual(messages);
    expect(footer.handle.setContent).toHaveBeenCalledTimes(updates);
  });

  it('catches up after delayed browser ticks without replaying stale warnings', () => {
    vi.useFakeTimers();
    const mock = setup();
    runAlias(mock, 'broktime_test');
    vi.setSystemTime(Date.now() + 92_000);
    vi.advanceTimersByTime(1000);
    expect(mock.footerComponents[0].handle.setContent).toHaveBeenLastCalledWith(expect.stringContaining('7 s'));
    expect(printedTexts(mock).filter(Boolean).slice(3)).toEqual([
      '[Brokilon] Zostalo 7 s!',
    ]);
    vi.setSystemTime(Date.now() + 20_000);
    vi.advanceTimersByTime(1000);
    expect(mock.footerComponents[0].handle.setContent).toHaveBeenLastCalledWith(expect.stringContaining('CZAS MINAL... zyjecie? 😆'));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the explicitly disabled two-minute trigger inactive', () => {
    const mock = setup();
    runLine(mock, 'Dobiega cie echo glosnego huku, powodujacego drzenie calych katakumb!');
    expect(printedTexts(mock)).toEqual([]);
  });
});

describe('Brokilon aliases', () => {
  it.each([
    ['ql', ['ob grobowiec']],
    ['take', [
      'otworz trumne zdobionym kluczykiem',
      'otworz trumne',
      'wez wszystko z trumny',
    ]],
    [
      'sjj',
      [
        'otworz grobowiec',
        'wez zloty klucz z grobowca',
        'otworz sarkofag',
        'wez zloty klucz z sarkofagu',
        'otworz trumne',
        'wez zloty klucz z trumny',
      ],
    ],
    ['klr', ['przeczytaj prawy napis', 'wloz zloty klucz do prawego zamka']],
    ['kll', ['przeczytaj lewy napis', 'wloz zloty klucz do lewego zamka']],
    [
      'xb',
      [
        'otworz grobowiec',
        'wez wszystkie zbroje z grobowca',
        'odloz je',
        'wez wszystko z grobowca',
        'odloz szczatki',
      ],
    ],
    ['szu', ['otworz grobowiec', 'przeszukaj grobowiec']],
    ['p1', ['przeszukaj dlon']],
    ['p2', ['przeszukaj ksiege']],
    ['p3', ['przeszukaj kafelek']],
    ['p4', ['przeszukaj polke']],
    ['p5', ['przeszukaj dziure']],
    ['p6', ['przeszukaj piedestaly']],
  ])('maps %s to its command sequence', (alias, expected) => {
    const mock = setup();
    runAlias(mock, alias as string);
    expect(sentCommands(mock)).toEqual(expected);
  });

  it('sheathes the dagger when the strap cut finishes', () => {
    const mock = setup();
    runAlias(mock, 'cut');
    expect(sentCommands(mock)).toEqual(['dobs', 'przetnij rzemien']);

    runLine(mock, 'Zaczynasz przecinac rzemien.');
    expect(sentCommands(mock)).toEqual(['dobs', 'przetnij rzemien']);

    runLine(mock, 'Przecinasz rzemien.');
    expect(sentCommands(mock)).toEqual(['dobs', 'przetnij rzemien', 'opus']);

    runLine(mock, 'Przecinasz rzemien.');
    expect(sentCommands(mock)).toEqual(['dobs', 'przetnij rzemien', 'opus']);
  });

  it('uses the default passwords', () => {
    const mock = setup();
    runAlias(mock, 'ha1');
    runAlias(mock, 'ha2');
    expect(sentCommands(mock)).toEqual(['powiedz Kirkaran', 'powiedz ']);
  });

  it('runs the complete al! inspection sequence', () => {
    const mock = setup();
    runAlias(mock, 'al!');
    expect(sentCommands(mock)).toHaveLength(27);
    expect(sentCommands(mock)[0]).toBe('ob lewy posag');
    const commands = sentCommands(mock);
    expect(commands[commands.length - 1]).toBe('ob glowice');
  });
});
