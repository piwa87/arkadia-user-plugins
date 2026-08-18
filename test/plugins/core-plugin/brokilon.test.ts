import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupBrokilon } from '../../../src/plugins/core-plugin/brokilon';
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
  ])('announces a key for: %s', (text) => {
    const mock = setup();

    runLine(mock, text);

    expect(printedTexts(mock)).toEqual(['', '   K L U C Z Y K  !!!', '']);
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

  it('learns a new first password and uses it through ha1', () => {
    const mock = setup();

    runLine(mock, 'Imie ich bylo Eithne, a pamiec o nich pozostala.');
    runAlias(mock, 'ha1');

    expect(sentCommands(mock)).toContain('powiedz Eithne');
    expect(printedTexts(mock)).toContain("--> Zlapalem nowe haslo: 'Eithne'");
  });

  it('starts the 100-second warning and cancels it during cleanup', () => {
    vi.useFakeTimers();
    const mock = setup();

    runLine(mock, 'Po wlozeniu drugiego klucza wrota otwieraja sie z ciezkim zgrzytem!');

    expect(sentCommands(mock)).toEqual(['napelnij lampe olejem', 'sus2']);
    expect(printedTexts(mock)).toEqual([
      '',
      '     1 0 0       S E K U N D     !!!',
      '',
      '--> Odliczam 100 sekund!',
    ]);

    vi.advanceTimersByTime(95_000);
    expect(printedTexts(mock)).toContain('TICK IN 5 SECONDS.');

    runLine(mock, 'Po wlozeniu drugiego klucza wrota otwieraja sie z ciezkim zgrzytem!');
    mock.cleanup();
    vi.advanceTimersByTime(95_000);
    expect(printedTexts(mock).filter((text) => text === 'TICK IN 5 SECONDS.')).toHaveLength(1);
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
    ['cut', ['dobs', 'przetnij rzemien', 'opus']],
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

  it('uses the default passwords', () => {
    const mock = setup();
    runAlias(mock, 'ha1');
    runAlias(mock, 'ha2');
    expect(sentCommands(mock)).toEqual(['powiedz Kiranhim', 'powiedz ']);
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
