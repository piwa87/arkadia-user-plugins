import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAnsiFormatState } from '../../../src/lib/colors/my-ansi-colors';
import { setupDylizansy } from '../../../src/plugins/core-plugin/movement/dylizansy';
import { setupGlassSounds } from '../../../src/plugins/core-plugin/sounds/glass_sound';
import { setupPingSounds } from '../../../src/plugins/core-plugin/sounds/ping_sounds';
import { createMockApi, MockAnsiAwareBuffer, runLine } from '../../helpers/mockApi';

function sentCommands(mock: ReturnType<typeof createMockApi>): string[] {
  return (mock.api.command.send as any).mock.calls.map(([cmd]: [string]) => cmd);
}

function printedTexts(mock: ReturnType<typeof createMockApi>): string[] {
  return (mock.api.output.print as any).mock.calls.map(([arg]: [unknown]) =>
    arg instanceof MockAnsiAwareBuffer ? arg.text : String(arg),
  );
}

describe('glass_sound triggers', () => {
  function setup() {
    const mock = createMockApi();
    setupGlassSounds(mock.api);
    return mock;
  }

  it.each([
    'Prom powoli zatrzymuje sie.',
    'Woz cicho skrzypiac zatrzymuje sie.',
    'Statek z wolna doplywa do brzegu.',
    'Statek przybija do brzegu.',
    'Przez poklad przebiega drzenie.',
    'Drzenie przebiega poklad.',
    'Powoli pojazd zaczyna tracic predkosc, by po chwili zatrzymac sie.',
    'Monotonne kolysanie ustaje.',
    'Z zewnatrz slyszysz glos woznicy: Fermata - incrocio alla Miragliano!',
    'Z zewnatrz slyszysz glos woznicy: Przystanek - zielona morda',
  ])('prefixes the transport line without printing a banner: %s', (announcement) => {
    const mock = setup();
    const line = runLine(mock, announcement)!;
    expect(line.text).toBe(`[transport] ${announcement}`);
    expect(line.color).toHaveBeenCalledWith([0, announcement.length], getAnsiFormatState(3, mock.api));
    const prefix = line.prependBuffer.mock.calls[0][0];
    expect(prefix.segments).toEqual([
      { text: '[transport]', state: getAnsiFormatState(34, mock.api) },
      { text: ' ', state: getAnsiFormatState(3, mock.api) },
    ]);
    expect(printedTexts(mock)).toEqual([]);
    expect(sentCommands(mock)).toEqual([]);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('preserves stop notifications when the transport prefix is added', () => {
    const notification = vi.fn();
    vi.stubGlobal('Notification', Object.assign(notification, { permission: 'granted' }));
    const mock = setup();
    setupDylizansy(mock.api);

    const announcement = 'Z zewnatrz slyszysz glos woznicy: Fermata - incrocio alla Viadaza!';
    expect(runLine(mock, announcement)?.text).toBe(`[transport] ${announcement}`);
    expect(notification).toHaveBeenCalledExactlyOnceWith('🚏 Incrocio alla Viadaza!');

    const departure = 'Z zewnatrz slyszysz glos woznicy: Partire per Varieno in qualche minuti!';
    expect(runLine(mock, departure)?.text).toBe(departure);
    expect(notification).toHaveBeenCalledTimes(1);
    expect(printedTexts(mock)).toEqual([]);
  });

  it('prints banner and plays glass when magik burns', () => {
    const mock = setup();
    runLine(mock, 'Bialy, zimny plomien ogarnia wysokiego magika, w kilka chwil spopielajac go calkowicie.');
    expect(printedTexts(mock).some((t) => t.includes('pozarlo magika'))).toBe(true);
    expect(sentCommands(mock)).toContain('play_glass');
  });

  it('handles torch burning out', () => {
    const mock = setup();
    const line = runLine(mock, 'Zwykla pochodnia wypala sie i gasnie.');
    expect(sentCommands(mock)).toContain('play_glass');
    expect(sentCommands(mock)).toContain('f+ odloz wypalone pochodnie|zapal pochodnie|zapal swiece|naplam');
    expect(line!.text.startsWith('   bad    ')).toBe(true);
  });

  it('handles candle burning out with candle-specific bind', () => {
    const mock = setup();
    runLine(mock, 'Woskowa swieca wypala sie i gasnie.');
    expect(sentCommands(mock)).toContain('f+ odloz wypalone swiece|zapal swiece');
  });

  it('handles oil flask drained empty', () => {
    const mock = setup();
    runLine(mock, 'Wysaczasz ostatnie krople, oprozniajac zupelnie butelke oleju.');
    expect(sentCommands(mock)).toContain('play_glass');
    expect(sentCommands(mock)).toEqual(['play_glass']);
  });

  it('plays glass on new mail', () => {
    const mock = setup();
    runLine(mock, 'Masz nowa poczte od Vaelina.');
    expect(sentCommands(mock)).toContain('play_glass');
  });

  it('ignores unrelated lines', () => {
    const mock = setup();
    runLine(mock, 'Stoisz na srodku zakurzonej drogi.');
    expect(sentCommands(mock)).toHaveLength(0);
    expect(printedTexts(mock)).toHaveLength(0);
  });
});

describe('ping_sounds triggers', () => {
  it('plays ping on experience progress line', () => {
    const mock = createMockApi();
    setupPingSounds(mock.api);
    runLine(mock, 'Poczyniles niewielkie postepy, od momentu kiedy ostatnio przegladales swoje statystyki gry.');
    expect(sentCommands(mock)).toContain('play_ping');
  });

  it('matches the feminine form as well', () => {
    const mock = createMockApi();
    setupPingSounds(mock.api);
    runLine(mock, 'Poczynilas spore postepy, od momentu kiedy ostatnio przegladales swoje statystyki gry.');
    expect(sentCommands(mock)).toContain('play_ping');
  });
});
