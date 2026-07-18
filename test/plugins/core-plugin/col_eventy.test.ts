import { describe, expect, it } from 'vitest';
import { setupColEventy } from '../../../src/plugins/core-plugin/colors/col_eventy';
import { createMockApi, MockAnsiAwareBuffer, runLine } from '../../helpers/mockApi';

function setup() {
  const mock = createMockApi();
  setupColEventy(mock.api);
  return mock;
}

function printedTexts(mock: ReturnType<typeof createMockApi>): string[] {
  return (mock.api.output.print as any).mock.calls.map(([arg]: [unknown]) =>
    arg instanceof MockAnsiAwareBuffer ? arg.text : String(arg),
  );
}

function sentCommands(mock: ReturnType<typeof createMockApi>): string[] {
  return (mock.api.command.send as any).mock.calls.map(([cmd]: [string]) => cmd);
}

describe('col_eventy', () => {
  it('megaphones announce when klucznik flees', () => {
    const mock = setup();
    runLine(mock, 'Tegi gluchy mezczyzna ciezko dyszac ucieka na wschod.');
    const printed = printedTexts(mock);
    expect(printed.some((t) => t.includes('K L U C Z N I K') && t.includes('!!!'))).toBe(true);
  });

  it('megaphones announce for kultysci leaving', () => {
    const mock = setup();
    runLine(mock, 'Kultysci rozchodza sie, znikajac miedzy drzewami.');
    const printed = printedTexts(mock);
    expect(printed.some((t) => t.includes('K U L T Y S C I'))).toBe(true);
  });

  it('plays ding and colors line on danger alert', () => {
    const mock = setup();
    const line = runLine(mock, 'Cos zbliza sie do ciebie przez pobliskie szuwary!');
    expect(sentCommands(mock)).toContain('play_ding');
    expect(line!.color).toHaveBeenCalled();
    expect(line!.text).toBe('Cos zbliza sie do ciebie przez pobliskie szuwary!');
  });

  it('prints sandstorm ON banner', () => {
    const mock = setup();
    runLine(mock, 'Ogarnia cie burza piaskowa!');
    expect(printedTexts(mock).some((t) => t.includes('BURZA PIASKOWA - ON!!!'))).toBe(true);
  });

  it('prints sandstorm OFF banner when storm moves away', () => {
    const mock = setup();
    runLine(mock, 'Burza piaskowa przesuwa sie dalej na wschod.');
    expect(printedTexts(mock).some((t) => t.includes('BURZA PIASKOWA - OFF!!!'))).toBe(true);
  });

  it('prints fog banner exactly once', () => {
    const mock = setup();
    runLine(
      mock,
      'Z okolicznych dolin i kotlin bardzo szybko unosi sie biala i gesta mgla. Widocznosc szybko sie pogarsza, robi sie zimno i wilgotno.',
    );
    const fogPrints = printedTexts(mock).filter((t) => t.includes('MGLA'));
    expect(fogPrints).toHaveLength(1);
  });

  it('prints drowning banner and plays glass for storm wave (string pattern)', () => {
    const mock = setup();
    runLine(mock, 'Ponad twoja glowa przelamuje sie potezna sztormowa fala, ktora wciska cie w glebine.');
    expect(printedTexts(mock).some((t) => t.includes('ZATOPILA CIE FALA'))).toBe(true);
    expect(sentCommands(mock)).toContain('play_glass');
  });

  it('prepends [ zle ] label when stunned', () => {
    const mock = setup();
    const line = runLine(mock, 'Jestes ogluszony i nie mozesz nic zrobic.');
    expect(line!.text).toBe('[ zle ] Jestes ogluszony i nie mozesz nic zrobic.');
  });

  it('prepends [ zle ] and tints line for empty container', () => {
    const mock = setup();
    const line = runLine(mock, 'Skorzana sakwa jest zupelnie pusta.');
    expect(line!.text).toBe('[ zle ] Skorzana sakwa jest zupelnie pusta.');
    expect(line!.color).toHaveBeenCalled();
  });

  it('replaces upior line entirely', () => {
    const mock = setup();
    const line = runLine(
      mock,
      'Hipnotyzujacy ulotny upior otwiera niematerialne usta, z ktorych zaczyna dobiegac niepokojacy dzwiek.',
    );
    expect(line!.text).toBe('.....UPIOR PIERDNAL!');
  });

  it('colors aggressive plant line', () => {
    const mock = setup();
    const line = runLine(mock, 'Slynna agresywna roslina.');
    expect(line!.color).toHaveBeenCalled();
    expect(line!.text).toBe('Slynna agresywna roslina.');
  });

  it('colors each aggressive plant variant exactly once', () => {
    const mock = setup();
    for (const text of [
      'Pokoniunkcyjna drapiezna roslina.',
      'Pnacy agresywny stwor.',
      'Pokoniunkcyjna agresywna roslina.',
    ]) {
      const line = runLine(mock, text);
      expect(line!.color).toHaveBeenCalledTimes(1);
      expect(line!.text).toBe(text);
    }
  });

  it('prepends heal label for amulet heal', () => {
    const mock = setup();
    const line = runLine(mock, 'Od twojego amuletu emanuje przyjemne cieplo.');
    expect(line!.text).toBe('  amulet leczy   Od twojego amuletu emanuje przyjemne cieplo.');
  });

  it('prepends slizganie label for first-person ice slide', () => {
    const mock = setup();
    const line = runLine(mock, 'Probujesz isc do przodu, ale sliski lod sprawia, ze wywracasz sie na nim.');
    expect(line!.text.startsWith('          slizganie           ')).toBe(true);
  });

  it('prepends DENOMINATION label', () => {
    const mock = setup();
    const line = runLine(mock, 'Twoje pieniadze zostaly zdenominowane.');
    expect(line!.text.startsWith('   DENOMINATION   ')).toBe(true);
  });

  it('plays tink and colors line when blacksmith finishes work', () => {
    const mock = setup();
    const line = runLine(mock, 'Niski krasnolud konczy prace.');
    expect(sentCommands(mock)).toContain('play_tink');
    expect(line!.color).toHaveBeenCalled();
  });

  it('signals when earth elemental hits you', () => {
    const mock = setup();
    runLine(
      mock,
      'Jedno z nich, zakonczone omszalym glazem trafia wprost w ciebie! Bezwladnie odrywasz sie od ziemi i wymachujac rekami przelatujesz dosc spory kawalek, by gruchnac o ziemie. Czujesz, jak wszystkie bebechy wywrocily sie w twoim ciele.',
    );
    expect(sentCommands(mock)).toContain('sig Aucik!');
  });

  it('does nothing on unrelated lines', () => {
    const mock = setup();
    const line = runLine(mock, 'Zwykla konopna lina lezy na ziemi.');
    expect(line!.text).toBe('Zwykla konopna lina lezy na ziemi.');
    expect(printedTexts(mock)).toHaveLength(0);
    expect(sentCommands(mock)).toHaveLength(0);
    expect(line!.color).not.toHaveBeenCalled();
  });
});
