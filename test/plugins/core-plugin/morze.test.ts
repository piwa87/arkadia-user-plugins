import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupMorze } from '../../../src/plugins/core-plugin/morze';
import { stopSequences } from '../../../src/lib/sequenceStop';
import { getAnsiFormatState } from '../../../src/lib/colors/my-ansi-colors';
import { createMockApi, runLine } from '../../helpers/mockApi';

function fixture() {
  const mock = createMockApi();
  const cleanup = setupMorze(mock.api);
  const alias = (text: string) => {
    const entry = mock.aliases.find(a => a.pattern.test(text));
    if (!entry) throw new Error(`Missing alias: ${text}`);
    entry.callback(text.match(entry.pattern)!);
  };
  const commands = () => vi.mocked(mock.api.command.send).mock.calls.map(c => c[0]);
  const output = () => vi.mocked(mock.api.output.print).mock.calls.map(([value]) =>
    typeof value === 'string' ? value : value.text);
  return { mock, cleanup, alias, commands, output };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Morze XML port', () => {
  it.each([
    ['wrak!', 'szukaj wraku', 8], ['per8', 'przeszukaj dno', 8], ['per4', 'przeszukaj dno', 4],
  ] as const)('%s runs the XML command and notifies after the last wait', (name, command, count) => {
    const f = fixture();
    const notification = vi.fn();
    vi.stubGlobal('Notification', Object.assign(notification, { permission: 'granted' }));
    f.alias(name);
    expect(f.commands()).toEqual([command]);
    vi.advanceTimersByTime(count * 6200 - 1);
    expect(f.commands()).toEqual(Array(count).fill(command));
    expect(f.output()).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(f.commands()).toEqual([...Array(count).fill(command), 'play_tink']);
    expect(f.output()).toEqual(['DALEJ']);
    expect(notification).toHaveBeenCalledWith('DALEJ');
  });

  it('per! moves, waits and searches five times', () => {
    const f = fixture(); f.alias('per! ne');
    expect(f.commands()).toEqual(['ne']);
    vi.advanceTimersByTime(6199);
    expect(f.commands()).toEqual(['ne']);
    vi.runAllTimers();
    expect(f.commands()).toEqual(['ne', ...Array(5).fill('przeszukaj dno'), 'play_tink']);
  });

  it('perly! opens five shells without inventing extra waits', () => {
    const f = fixture(); f.alias('perly!');
    expect(f.commands()).toEqual(['dobs', ...Array.from({ length: 5 }, () =>
      ['otworz muszle sztyletem', 'wez perle z muszli', 'wlz muszle']).flat(), 'opus']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['qu', 'mr-', 'destroy', 'prr', 'disconnect', 'wyp!'])('%s cancels pending searches', stop => {
    const f = fixture(); f.alias('per8');
    if (stop === 'destroy') f.cleanup();
    else if (stop === 'prr') stopSequences(f.mock.api);
    else if (stop === 'disconnect') f.mock.api.events.emit('client.disconnect');
    else f.alias(stop);
    const before = f.commands();
    vi.runAllTimers();
    expect(f.commands()).toEqual(before);
    expect(f.output()).not.toContain('DALEJ');
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['qu', 'wyp!', 'mr-'])('%s cancels the delayed dive', stop => {
    const f = fixture(); f.alias('nur! 3');
    runLine(f.mock, 'Zanurzasz sie pod wode.');
    f.alias(stop);
    const before = f.commands();
    vi.runAllTimers();
    expect(f.commands()).toEqual(before);
  });

  it('qu does not falsely reset the known depth', () => {
    const f = fixture(); runLine(f.mock, 'Zanurzasz sie pod wode.');
    f.alias('qu'); f.alias('nur! 1');
    expect(f.commands()).toEqual(['sig Quit done!']);
  });

  it('a new search replaces the pending search instead of overlapping it', () => {
    const f = fixture(); f.alias('per8'); f.alias('per4'); vi.runAllTimers();
    expect(f.commands()).toEqual([...Array(5).fill('przeszukaj dno'), 'play_tink']);
    expect(f.output()).toEqual(['DALEJ']);
  });

  it('qu cancels per! before its first search', () => {
    const f = fixture(); f.alias('per! n'); f.alias('qu'); vi.runAllTimers();
    expect(f.commands()).toEqual(['n', 'sig Quit done!']);
  });

  it('nurek! dives to 3, searches 8 times, then surfaces', () => {
    const f = fixture(); f.alias('nurek!');
    runLine(f.mock, 'Zanurzasz sie pod wode.');
    vi.advanceTimersByTime(234);
    runLine(f.mock, 'Udaje ci sie sprawnie przeplynac.');
    vi.advanceTimersByTime(234);
    runLine(f.mock, 'Udaje ci sie sprawnie przeplynac.');
    expect(f.commands()).toEqual(['d', 'd', 'd', 'sig Dno!']);
    vi.runAllTimers();
    expect(f.commands()).toEqual(['d', 'd', 'd', 'sig Dno!', ...Array(8).fill('przeszukaj dno'), 'play_tink', 'u']);
    runLine(f.mock, 'Udaje ci sie sprawnie przeplynac.');
    vi.advanceTimersByTime(234);
    expect(f.commands().slice(-1)[0]).toBe('u');
    runLine(f.mock, 'Wynurzasz sie na powierzchnie.');
    const count = f.commands().length;
    runLine(f.mock, 'Udaje ci sie sprawnie przeplynac.');
    vi.runAllTimers();
    expect(f.commands()).toHaveLength(count);
  });

  it('nur! 1 stops after immersion without starting pearl searches', () => {
    const f = fixture(); f.alias('nur! 1');
    runLine(f.mock, 'Zanurzasz sie pod wode.'); vi.runAllTimers();
    expect(f.commands()).toEqual(['d', 'sig Dno!']);
  });

  it('wodor! gathers after swimming and critical air cancels pending collection', () => {
    const f = fixture(); f.alias('wodor! n');
    runLine(f.mock, 'Udaje ci sie sprawnie przeplynac.');
    vi.advanceTimersByTime(234);
    expect(f.commands()).toEqual(['wez wodorosty', 'n', 'wez wodorosty', 'n']);
    runLine(f.mock, 'Udaje ci sie sprawnie przeplynac.');
    runLine(f.mock, 'Twoje pluca rozdziera ogromny bol. Dusisz sie!');
    vi.runAllTimers();
    expect(f.commands().slice(4)).toEqual(['play_tink', 'przestan plynac', 'u']);
  });

  it('nurk follows sequential XML timing, and seaweed detection is one-shot', () => {
    const f = fixture(); f.alias('nurk ne');
    expect(f.commands()).toEqual(['wez wodorosty', 'd']);
    runLine(f.mock, 'Widzisz wodorosty.');
    vi.advanceTimersByTime(6200);
    expect(f.commands()).toEqual(['wez wodorosty', 'd', 'wez wodorosty', 'd']);
    runLine(f.mock, 'Widzisz wodorosty.');
    vi.advanceTimersByTime(6200 * 2 + 789);
    expect(f.commands().slice(-2)).toEqual(['sp', 'przeszukaj dno']);
    vi.advanceTimersByTime(6200 * 5);
    expect(f.commands().slice(-1)[0]).toBe('ne');
    vi.advanceTimersByTime(6400 + 6100 * 5);
    expect(f.commands().slice(-1)[0]).toBe('u');
    vi.runAllTimers();
    expect(f.commands()).toEqual(['wez wodorosty', 'd', 'wez wodorosty', 'd', 'd', 'sp',
      ...Array(5).fill('przeszukaj dno'), 'ne', ...Array(5).fill('przeszukaj dno'), 'u', 'u', 'u']);
    expect(f.output()).toEqual(['NEXT MOVE']);
  });

  it('nurk waits for the actual random delays instead of separately estimating phase lengths', () => {
    vi.mocked(Math.random).mockReturnValue(0.9999);
    const f = fixture(); f.alias('nurk n');
    vi.advanceTimersByTime(3 * 6600 + 789 - 1);
    expect(f.commands()).not.toContain('sp');
    vi.advanceTimersByTime(1);
    expect(f.commands().slice(-2)).toEqual(['sp', 'przeszukaj dno']);
    vi.advanceTimersByTime(5 * 6600 - 1);
    expect(f.commands()).not.toContain('n');
    vi.advanceTimersByTime(1);
    expect(f.commands().slice(-1)[0]).toBe('n');
  });

  it('disabling stops automation and bypasses all formatting until re-enabled', () => {
    const f = fixture(); f.alias('nurk n'); f.alias('mr-');
    const count = f.commands().length;
    f.alias('per8'); vi.runAllTimers();
    expect(f.commands()).toHaveLength(count);
    const text = 'Ostroznie wyjmujesz perle z muszli.';
    expect(runLine(f.mock, text)?.text).toBe(text);
    f.alias('mr+');
    expect(runLine(f.mock, text)?.text).toBe(' PERLA ' + text);
  });

  it('cleanup removes all triggers/listeners and cancels the long routine', () => {
    const f = fixture(); f.alias('nurk n'); f.cleanup();
    expect(f.mock.triggers).toEqual([]);
    expect(f.mock.tokenTriggers).toEqual([]);
    expect([...f.mock.eventListeners.values()].flat()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Morze output', () => {
  it.each([
    ['na plyciznie', 1], ['pod woda', 2], ['glebiny', 3], ['mroczne glebiny', 4], ['dno morskie', 5],
    ['tuz pod powierzchnia morza', 1], ['morska glebina', 2], ['w mrocznej glebinie', 3],
  ])('numbers %s within its region', (name, depth) => {
    const f = fixture();
    const line = runLine(f.mock, name + '.');
    expect(line?.text).toBe(`[${depth}] ${name}.`);
    expect(line?.prepend).toHaveBeenCalledWith(`[${depth}] `, getAnsiFormatState(126, f.mock.api));
    expect(f.output()).toEqual([]);
  });

  it.each([
    ['Udaje ci sie sprawnie przeplynac.', ' * '], ['asdjagshdgasd.', ' * '],
    ['Zanurzasz sie pod wode.', ' * '], ['Wynurzasz sie z wody.', ' A I R '],
    ['Wynurzasz sie na powierzchnie.', ' A I R '],
    ['Wynurzasz sie na powierzchnie lapczywie lapiac powietrze w pluca.', ' A I R '],
    ['Ostroznie wyjmujesz perle z muszli.', ' PERLA '],
    ['Szukasz, az w koncu natrafiasz na zoltawobrazowy bursztyn.', ' * '],
    ['Przebywanie pod woda staje sie coraz trudniejsze. Pomysl o wyplynieciu na powierzchnie.', '      powietrze:   UWAGA      '],
  ])('preserves original text: %s', (text, prefix) => {
    const f = fixture();
    expect(runLine(f.mock, text)?.text).toBe(prefix + text);
    expect(f.output()).toEqual([]);
  });

  it.each([
    'W twych plucach braknie juz tlenu. Lepiej wyplyn natychmiast.',
    'Czujesz ze za chwile pluca pekna ci z braku tlenu. Wyplyn natychmiast!',
    'Twoje pluca rozdziera ogromny bol. Dusisz sie!',
    'Woda wdziera sie do twoich pluc. Dlawisz sie i krztusisz, az w koncu ciemnosc zasnuwa ci oczy.',
  ])('critical warning beeps once and preserves %s', text => {
    const f = fixture();
    expect(runLine(f.mock, text)?.text).toBe('      powietrze:   WYPLYN      ' + text);
    expect(f.commands()).toEqual(['play_tink']);
  });

  it('colors shells and failed searches, warns locally about the current', () => {
    const f = fixture();
    const shell = runLine(f.mock, 'Znalazles wielka muszle.');
    expect(shell?.text).toBe('Znalazles wielka muszle');
    expect(shell?.color).toHaveBeenCalledWith([10, 23], getAnsiFormatState(12, f.mock.api));
    const empty = 'Nie udalo ci sie znalezc niczego interesujacego.';
    expect(runLine(f.mock, empty)?.text).toBe(empty);
    const current = 'Nie masz juz sil walczyc z zywiolem i dajesz sie poniesc pradowi na dol.';
    expect(runLine(f.mock, current)?.text).toBe(current);
    expect(f.output()).toEqual(['OJ OJ OJ OJ']);
    expect(f.commands()).toEqual(['play_basso']);
    runLine(f.mock, 'Szukasz, az w koncu natrafiasz na zoltawobrazowy bursztyn.');
    expect(f.commands().slice(-1)[0]).toBe('play_ding');
  });

  it('keeps archived air triggers disabled and all sea triggers token-indexed', () => {
    const f = fixture();
    for (const time of ['troche', 'dlugo']) {
      const text = `Zapas powietrza wystarczy ci jeszcze na ${time}.`;
      expect(runLine(f.mock, text)?.text).toBe(text);
    }
    expect(f.mock.triggers).toEqual([]);
  });
});

describe('Morze amber route', () => {
  function routeFixture() {
    const f = fixture();
    let room = { id: 1, exits: { north: 2 }, specialExits: {} };
    vi.mocked(f.mock.api.map.getRoom).mockImplementation(() => room as any);
    f.mock.api.events.emit('mapPath', { segments: [{ path: [1, 2, 3], color: 'red' }] });
    return { ...f, move: (id: number) => { room = { id, exits: { north: id + 1 }, specialExits: {} }; } };
  }

  it('moves along the marked path, searches four times per step, then ends', () => {
    const f = routeFixture(); f.alias('bur!');
    expect(f.commands()).toEqual(['n', 'przeszukaj dno']);
    f.move(2); vi.advanceTimersByTime(4 * 6200 + 234);
    expect(f.commands()).toEqual(['n', ...Array(4).fill('przeszukaj dno'), 'n', 'przeszukaj dno']);
    f.move(3); f.mock.api.events.emit('mapPath', null); vi.runAllTimers();
    expect(f.commands()).toEqual(['n', ...Array(4).fill('przeszukaj dno'), 'n', ...Array(4).fill('przeszukaj dno'), 'sig Koniec trasy.']);
    expect(f.output()).toEqual(['KONIEC TRASY']);
  });

  it.each(['bur!', 'bur!!'])('%s terminates without searching when no next_dir exists', name => {
    const f = fixture(); f.alias(name); vi.runAllTimers();
    expect(f.commands()).toEqual(['sig Koniec trasy.']);
    expect(f.output()).toEqual(name === 'bur!!' ? ['KONIEC TRASY'] : []);
  });

  it('does not loop forever if movement failed', () => {
    const f = routeFixture(); f.alias('bur!'); vi.runAllTimers();
    expect(f.commands()).toEqual(['n', ...Array(4).fill('przeszukaj dno')]);
    expect(f.output()[0]).toContain('Brak zmiany lokacji');
  });

  it('bur!! performs one step when bur! has not enabled repetition', () => {
    const f = routeFixture(); f.alias('bur!!'); f.move(2); vi.runAllTimers();
    expect(f.commands()).toEqual(['n', ...Array(4).fill('przeszukaj dno')]);
  });

  it('qu cancels the next amber move during its final wait', () => {
    const f = routeFixture(); f.alias('bur!'); f.move(2);
    vi.advanceTimersByTime(4 * 6200);
    f.alias('qu'); vi.runAllTimers();
    expect(f.commands()).toEqual(['n', ...Array(4).fill('przeszukaj dno'), 'sig Quit done!']);
  });

  it('supports multiple route segments and special exits', () => {
    const f = routeFixture();
    f.mock.api.events.emit('mapPath', { segments: [
      { path: [1, 2], color: 'red' }, { path: [2, 3], color: 'blue' },
    ] });
    f.alias('bur!');
    vi.mocked(f.mock.api.map.getRoom).mockReturnValue({
      id: 2, exits: {}, specialExits: { 'przeplyn szczeline': 3 },
    } as any);
    vi.advanceTimersByTime(4 * 6200 + 234);
    expect(f.commands().slice(-2)).toEqual(['przeplyn szczeline', 'przeszukaj dno']);
  });
});
