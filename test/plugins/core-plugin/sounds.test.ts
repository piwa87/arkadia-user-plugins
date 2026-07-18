import { describe, expect, it } from 'vitest';
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

  it('prints transport banner on arrival', () => {
    const mock = setup();
    runLine(mock, 'Prom powoli zatrzymuje sie.');
    expect(printedTexts(mock).filter((t) => t.includes('transport'))).toHaveLength(1);
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
    expect(line!.text.startsWith('[ zle ] ')).toBe(true);
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
    expect(sentCommands(mock)).toContain('f+ odloz butelke|ot|wyj butelke|naplam');
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
