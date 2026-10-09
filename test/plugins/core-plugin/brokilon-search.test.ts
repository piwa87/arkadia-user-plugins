import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupBrokilon } from '../../../src/plugins/core-plugin/brokilon';
import { createMockApi, MockAnsiAwareBuffer, runLine, type MockApi } from '../../helpers/mockApi';

const PLACES = [
  ['p1', 'dlon', 'dlon'],
  ['p2', 'ksiege', 'ksiega'],
  ['p3', 'kafelek', 'kafelek'],
  ['p4', 'polke', 'polka'],
  ['p5', 'dziure', 'dziura'],
  ['p6', 'piedestaly', 'piedestaly'],
] as const;
const HOLE_RESULT = 'Przygladasz sie dziurze uwazniej, probujac znalezc jakiekolwiek slady tego, co bylo na jej miejscu.';
const HAND_RESULT = 'Zagladasz do zacisnietej dloni elfki, spodziewajac sie jakiegos niewielkiego przedmiotu - broszki, pierscionka, kolczyka.';
const EMPTY_RESULT = 'Niestety nic takiego tu nie ma.';

function alias(mock: MockApi, command: string) {
  const entry = mock.aliases.find(({ pattern }) => pattern.test(command));
  expect(entry).toBeDefined();
  entry!.callback(command.match(entry!.pattern)!);
}

function setup() {
  const mock = createMockApi();
  const cleanup = setupBrokilon(mock.api);
  alias(mock, 'brok+');
  return { ...mock, cleanup };
}

function report(mock: MockApi): string[] {
  vi.mocked(mock.api.output.print).mockClear();
  alias(mock, 'brokszuk');
  return vi.mocked(mock.api.output.print).mock.calls.map(([value]) =>
    value instanceof MockAnsiAwareBuffer ? value.text : String(value));
}

function footer(mock: MockApi) {
  return mock.footerComponents.find(({ id }) => id === 'brokilon-search')!;
}

afterEach(() => vi.useRealTimers());

describe('Brokilon search tracking', () => {
  it.each(PLACES)('sends the matching search when clicking %s, including after a status refresh', (shortcut, target) => {
    const mock = setup();
    alias(mock, 'brokszuk');
    const widget = footer(mock);
    expect(widget.initialContent).toContain(`data-brokilon-search="${target}"`);
    expect(widget.initialContent).toContain(`title="przeszukaj ${target}"`);
    const closest = vi.fn(() => ({ dataset: { brokilonSearch: target } }));
    const click = () => widget.handle.element.onclick!.call(widget.handle.element, {
      target: { closest },
    } as unknown as PointerEvent);

    click();
    expect(mock.api.command.send).toHaveBeenCalledExactlyOnceWith(`przeszukaj ${target}`);
    expect(closest).toHaveBeenCalledWith('button[data-brokilon-search]');
    expect(report(mock).find((text) => text.includes(shortcut))).toContain('do przeszukania');

    runLine(mock, `Zaczynasz przeszukiwac ${target}.`);
    click();
    expect(mock.api.command.send).toHaveBeenCalledTimes(2);
    expect(mock.api.command.send).toHaveBeenLastCalledWith(`przeszukaj ${target}`);
    alias(mock, 'brok-');
    click();
    expect(mock.api.command.send).toHaveBeenCalledTimes(2);
    mock.cleanup();
    expect(widget.handle.element.onclick).toBeNull();
  });

  it('replays four fake searches, completes two, interrupts two, then calls brokszuk', async () => {
    const mock = setup();
    runLine(mock, 'Soroko konczy przeszukiwac dziure.');
    const states: string[][] = [];
    vi.mocked(mock.api.command.send).mockImplementation(async (command) => {
      if (command.startsWith('/fake ')) {
        runLine(mock, command.slice('/fake '.length));
        states.push(report(mock));
      } else alias(mock, command);
    });

    alias(mock, 'brokszuk_test');
    await vi.waitFor(() => expect(mock.api.command.send).toHaveBeenLastCalledWith('brokszuk'));

    const commands = vi.mocked(mock.api.command.send).mock.calls.map(([command]) => command);
    expect(commands).toHaveLength(9);
    expect(commands.slice(0, -1).every((command) => command.startsWith('/fake '))).toBe(true);
    expect(states[3].filter((text) => text.includes('w trakcie'))).toHaveLength(4);
    expect(report(mock)).toEqual([
      '[Brokilon] p1 dlon: przeszukane',
      '[Brokilon] p2 ksiega: przeszukane',
      '[Brokilon] p3 kafelek: do przeszukania',
      '[Brokilon] p4 polka: do przeszukania',
      '[Brokilon] p5 dziura: do przeszukania',
      '[Brokilon] p6 piedestaly: do przeszukania',
    ]);
  });

  it('does not start a replay while disabled and cancels a replay on brok-', async () => {
    const mock = setup();
    alias(mock, 'brok-');
    alias(mock, 'brokszuk_test');
    expect(mock.api.command.send).not.toHaveBeenCalled();
    alias(mock, 'brok+');
    let release!: () => void;
    vi.mocked(mock.api.command.send).mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));
    alias(mock, 'brokszuk_test');
    expect(mock.api.command.send).toHaveBeenCalledOnce();
    alias(mock, 'brok-');
    release();
    await Promise.resolve();
    expect(mock.api.command.send).toHaveBeenCalledOnce();
  });

  it('replays finding the key in the hand while another person searches the same place', () => {
    const mock = setup();
    for (const text of [
      'Soroko zaczyna przeszukiwac dziure.',
      'Zaczynasz przeszukiwac dlon.',
      'Zutzer zaczyna przeszukiwac dlon.',
      'Soroko konczy przeszukiwac dziure.',
      HAND_RESULT,
      'Znajdujesz w niej metalowy kluczyk!',
      'Powietrze zaczyna lekko drgac, ksztalty nieco zamazuja sie...',
      'Ku twojemu zdumieniu, mglisty elfi duch pojawil sie nagle tuz obok ciebie!',
      'Mglisty elfi duch celnie uderza Soroko niematerialnym bezbarwnym sztyletem i rozmytym zasniedzialym sztyletem, raniac go w korpus.',
      'Zutzer przestaje przeszukiwac dlon.',
    ]) runLine(mock, text);

    expect(report(mock)).toContain('[Brokilon] p1 dlon: przeszukane');
    expect(report(mock)).toContain('[Brokilon] p5 dziura: przeszukane');
    expect(mock.api.bind.set).toHaveBeenLastCalledWith('take', undefined, undefined);
    expect(mock.api.command.send).not.toHaveBeenCalled();
  });

  it.each(PLACES)('marks the correct place when another person finds the key: %s', (shortcut, target, label) => {
    const mock = setup();
    runLine(mock, `Zutzer zaczyna przeszukiwac ${target}.`);
    runLine(mock, 'Soroko zaczyna przeszukiwac dziure.');
    runLine(mock, 'Zutzer znajduje jakis niewielki przedmiot.');

    expect(report(mock)).toContain(`[Brokilon] ${shortcut} ${label}: przeszukane`);
    if (target !== 'dziure') expect(report(mock)).toContain('[Brokilon] p5 dziura: w trakcie (Soroko)');
  });

  it('does not attribute an unknown finder to a different person or an interrupted search', () => {
    const mock = setup();
    runLine(mock, 'Zaczynasz przeszukiwac dlon.');
    runLine(mock, 'Zutzer zaczyna przeszukiwac ksiege.');
    runLine(mock, 'Zutzer przestaje przeszukiwac ksiege.');
    runLine(mock, 'Zutzer znajduje jakis niewielki przedmiot.');
    runLine(mock, 'Soroko znajduje metalowy kluczyk!');
    expect(report(mock)).toContain('[Brokilon] p1 dlon: w trakcie (Ty)');
    expect(report(mock)).toContain('[Brokilon] p2 ksiega: do przeszukania');
  });

  it('tracks an unsuccessful hand result and clears it on interruption', () => {
    const mock = setup();
    runLine(mock, 'Zaczynasz przeszukiwac dlon.');
    runLine(mock, HAND_RESULT);
    runLine(mock, 'Przestajesz przeszukiwac dlon.');
    runLine(mock, EMPTY_RESULT);
    expect(report(mock)).toContain('[Brokilon] p1 dlon: do przeszukania');
    runLine(mock, 'Zaczynasz przeszukiwac dlon.');
    runLine(mock, HAND_RESULT);
    runLine(mock, EMPTY_RESULT);
    expect(report(mock)).toContain('[Brokilon] p1 dlon: przeszukane');
  });

  it('replays the supplied log: interrupted hand, finished book and hole, tile in progress', () => {
    const mock = setup();
    const log = [
      'Wielki grobowiec.',
      '====] E',
      'Zamknieta zlota trumna.',
      '[2] Soroko i Zutzer przybywaja za toba ze wschodu.',
      'Zaczynasz przeszukiwac dziure.',
      'Zutzer zaczyna przeszukiwac dlon.',
      'Soroko zaczyna przeszukiwac ksiege.',
      'Powietrze zaczyna lekko drgac, ksztalty nieco zamazuja sie...',
      'Ku twojemu zdumieniu, mglisty elfi duch pojawil sie nagle tuz obok ciebie!',
      'Zutzer przestaje przeszukiwac dlon.',
      'Mglisty elfi duch celnie uderza Zutzera dwoma rozmytymi bezbarwnymi sztyletami, ledwo muskajac go w nogi.',
      'Soroko konczy przeszukiwac ksiege.',
      HOLE_RESULT,
      EMPTY_RESULT,
      'Soroko zaczyna przeszukiwac kafelek.',
    ];
    for (const text of log) expect(runLine(mock, text)?.text).toBe(text);

    expect(report(mock)).toEqual([
      '[Brokilon] p1 dlon: do przeszukania',
      '[Brokilon] p2 ksiega: przeszukane',
      '[Brokilon] p3 kafelek: w trakcie (Soroko)',
      '[Brokilon] p4 polka: do przeszukania',
      '[Brokilon] p5 dziura: przeszukane',
      '[Brokilon] p6 piedestaly: do przeszukania',
    ]);
    expect(footer(mock).handle.setContent).toHaveBeenLastCalledWith(expect.stringContaining('chip--ok'));
    expect(footer(mock).handle.setContent).toHaveBeenLastCalledWith(expect.stringContaining('chip--warn'));
  });

  it.each(PLACES)('tracks start, interruption and completion for %s', (shortcut, target, label) => {
    const mock = setup();
    alias(mock, shortcut);
    expect(mock.api.command.send).toHaveBeenCalledWith(`przeszukaj ${target}`);
    // Sending a command is not evidence that the game accepted the search.
    expect(report(mock)).toContain(`[Brokilon] ${shortcut} ${label}: do przeszukania`);
    runLine(mock, `Zaczynasz przeszukiwac ${target}.`);
    expect(report(mock)).toContain(`[Brokilon] ${shortcut} ${label}: w trakcie (Ty)`);
    runLine(mock, `Przestajesz przeszukiwac ${target}.`);
    expect(report(mock)).toContain(`[Brokilon] ${shortcut} ${label}: do przeszukania`);
    runLine(mock, `Zutzer zaczyna przeszukiwac ${target}.`);
    runLine(mock, `Zutzer przestaje przeszukiwac ${target}.`);
    expect(report(mock)).toContain(`[Brokilon] ${shortcut} ${label}: do przeszukania`);
    runLine(mock, `Zutzer zaczyna przeszukiwac ${target}.`);
    runLine(mock, `Zutzer konczy przeszukiwac ${target}.`);
    expect(report(mock)).toContain(`[Brokilon] ${shortcut} ${label}: przeszukane`);
  });

  it('keeps other searchers active and does not undo a completed search', () => {
    const mock = setup();
    runLine(mock, 'Zutzer zaczyna przeszukiwac dlon.');
    runLine(mock, 'Soroko zaczyna przeszukiwac dlon.');
    runLine(mock, 'Zutzer przestaje przeszukiwac dlon.');
    expect(report(mock)).toContain('[Brokilon] p1 dlon: w trakcie (Soroko)');
    runLine(mock, 'Soroko konczy przeszukiwac dlon.');
    runLine(mock, 'Zaczynasz przeszukiwac dlon.');
    runLine(mock, 'Przestajesz przeszukiwac dlon.');
    expect(report(mock)).toContain('[Brokilon] p1 dlon: przeszukane');
  });

  it('abandons the previous place when a person switches searches', () => {
    const mock = setup();
    runLine(mock, 'Soroko zaczyna przeszukiwac dlon.');
    runLine(mock, 'Soroko zaczyna przeszukiwac ksiege.');
    runLine(mock, 'Soroko przestaje przeszukiwac dlon.');
    expect(report(mock)).toContain('[Brokilon] p1 dlon: do przeszukania');
    expect(report(mock)).toContain('[Brokilon] p2 ksiega: w trakcie (Soroko)');
  });

  it('accepts explicit completion even if the beginning was not observed', () => {
    const mock = setup();
    runLine(mock, 'Konczysz przeszukiwac polke.');
    runLine(mock, 'Soroko konczy przeszukiwac ksiege.');
    expect(report(mock)).toContain('[Brokilon] p4 polka: przeszukane');
    expect(report(mock)).toContain('[Brokilon] p2 ksiega: przeszukane');
  });

  it('requires the full first-person hole result and cancels it when interrupted', () => {
    const mock = setup();
    runLine(mock, HOLE_RESULT);
    runLine(mock, EMPTY_RESULT);
    expect(report(mock)).toContain('[Brokilon] p5 dziura: do przeszukania');
    runLine(mock, 'Zaczynasz przeszukiwac dziure.');
    runLine(mock, EMPTY_RESULT);
    expect(report(mock)).toContain('[Brokilon] p5 dziura: w trakcie (Ty)');
    runLine(mock, HOLE_RESULT);
    runLine(mock, 'Przestajesz przeszukiwac dziure.');
    runLine(mock, EMPTY_RESULT);
    expect(report(mock)).toContain('[Brokilon] p5 dziura: do przeszukania');
  });

  it('ignores unrelated searches and does not complete a search on generic failure', () => {
    const mock = setup();
    runLine(mock, 'Soroko zaczyna przeszukiwac skrzynie.');
    expect(mock.footerComponents).toHaveLength(0);
    runLine(mock, 'Zaczynasz przeszukiwac dlon.');
    runLine(mock, HOLE_RESULT);
    runLine(mock, EMPTY_RESULT);
    expect(report(mock)).toContain('[Brokilon] p1 dlon: w trakcie (Ty)');
    expect(report(mock)).toContain('[Brokilon] p5 dziura: do przeszukania');
  });

  it.each(['brokszuk_reset', 'gates', 'reenable'])('resets progress on %s', (action) => {
    vi.useFakeTimers();
    const mock = setup();
    runLine(mock, 'Soroko konczy przeszukiwac ksiege.');
    runLine(mock, 'Zaczynasz przeszukiwac dziure.');
    runLine(mock, HOLE_RESULT);
    if (action === 'gates') {
      runLine(mock, 'Po wlozeniu drugiego klucza wrota otwieraja sie z ciezkim zgrzytem!');
    } else if (action === 'reenable') {
      alias(mock, 'brok-');
      alias(mock, 'brok+');
    } else alias(mock, action);
    runLine(mock, EMPTY_RESULT);
    expect(report(mock)).toEqual(PLACES.map(([shortcut, , label]) =>
      `[Brokilon] ${shortcut} ${label}: do przeszukania`));
    mock.cleanup();
  });

  it('hides tracking and ignores messages and tracking aliases while disabled', () => {
    const mock = setup();
    runLine(mock, 'Soroko zaczyna przeszukiwac dlon.');
    alias(mock, 'brok-');
    const handle = footer(mock).handle;
    const updates = handle.setContent.mock.calls.length;
    runLine(mock, 'Soroko konczy przeszukiwac dlon.');
    alias(mock, 'brokszuk_reset');
    expect(report(mock)).toEqual([]);
    expect(handle.setVisible).toHaveBeenLastCalledWith(false);
    expect(handle.setContent).toHaveBeenCalledTimes(updates);
  });

  it('preserves progress on repeated brok+ and timer tests, and removes tracking on cleanup', () => {
    vi.useFakeTimers();
    const mock = setup();
    runLine(mock, 'Soroko konczy przeszukiwac ksiege.');
    alias(mock, 'brok+');
    alias(mock, 'broktime_test');
    expect(report(mock)).toContain('[Brokilon] p2 ksiega: przeszukane');
    const handle = footer(mock).handle;
    mock.cleanup();
    expect(handle.remove).toHaveBeenCalledOnce();
    expect(mock.tokenTriggers.filter(({ tag }) => tag === 'brokilonSearch')).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
