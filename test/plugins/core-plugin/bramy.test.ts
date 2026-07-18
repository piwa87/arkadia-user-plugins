import { describe, expect, it } from 'vitest';
import { setupBramy } from '../../../src/plugins/core-plugin/bramy';
import { createMockApi, runLine } from '../../helpers/mockApi';

function setup() {
  const mock = createMockApi();
  setupBramy(mock.api);
  return mock;
}

function sentCommands(mock: ReturnType<typeof createMockApi>): string[] {
  return (mock.api.command.send as any).mock.calls.map(([cmd]: [string]) => cmd);
}

describe('bramy triggers', () => {
  it('colors open gate room description', () => {
    const mock = setup();
    const line = runLine(mock, 'Otwarte drzwi prowadza na polnoc.');
    expect(line!.color).toHaveBeenCalledTimes(1);
    expect(line!.text).toBe('Otwarte drzwi prowadza na polnoc.');
  });

  it('colors closed gate room description', () => {
    const mock = setup();
    const line = runLine(mock, 'Zamkniete na glucho wrota goruja nad droga.');
    expect(line!.color).toHaveBeenCalledTimes(1);
  });

  it('prepends ZAMKNIETE label on closing event', () => {
    const mock = setup();
    const line = runLine(mock, 'Ogromna stalowa brama zamyka sie.');
    expect(line!.text).toBe('   ZAMKNIETE    Ogromna stalowa brama zamyka sie.');
  });

  it('fires exactly once when a closing line contains two keywords', () => {
    const mock = setup();
    const line = runLine(mock, 'Ciezka krata opada, zamykajac przejscie.');
    expect(line!.text.match(/ZAMKNIETE/g)).toHaveLength(1);
    expect(sentCommands(mock)).toHaveLength(0);
  });

  it('prepends OTWARTE label and plays morse on opening event', () => {
    const mock = setup();
    const line = runLine(mock, 'Wrota lekko uchylaja sie.');
    expect(line!.text).toBe('   OTWARTE    Wrota lekko uchylaja sie.');
    expect(sentCommands(mock).filter((c) => c === 'play_morse')).toHaveLength(1);
  });

  it('fires exactly once when an opening line contains two keywords', () => {
    const mock = setup();
    const line = runLine(mock, 'Udaje ci sie uniesc zardzewiala krate, otwierajac przejscie.');
    expect(line!.text.match(/OTWARTE/g)).toHaveLength(1);
    expect(sentCommands(mock).filter((c) => c === 'play_morse')).toHaveLength(1);
  });

  it('prepends ZAMKNIETE when failing to open', () => {
    const mock = setup();
    const line = runLine(mock, 'Probujesz otworzyc wielkie wrota, ale nie udaje ci sie to.');
    expect(line!.text.startsWith('   ZAMKNIETE    ')).toBe(true);
  });

  it('ignores unrelated lines mentioning gates', () => {
    const mock = setup();
    const line = runLine(mock, 'Brama do miasta znajduje sie gdzies na wschodzie.');
    expect(line!.text).toBe('Brama do miasta znajduje sie gdzies na wschodzie.');
    expect(line!.color).not.toHaveBeenCalled();
    expect(sentCommands(mock)).toHaveLength(0);
  });
});
