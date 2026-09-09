import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DYNAMIC_WALKER_START_EVENT,
  rankOpenExits,
  setupWalker,
} from '../../../src/plugins/core-plugin/movement/walker';
import { createMockApi, MockAnsiAwareBuffer } from '../../helpers/mockApi';

function printedText(mock: ReturnType<typeof createMockApi>): string[] {
  return (vi.mocked(mock.api.output.print).mock.calls as unknown[][]).map(([line]) =>
    line instanceof MockAnsiAwareBuffer ? line.text : String(line),
  );
}

const target = { id: 99, x: 10, y: 0, z: 0, exits: {} } as any;
const current = {
  id: 1,
  x: 0,
  y: 0,
  z: 0,
  exits: { east: 2, north: 3, south: 4 },
} as any;
const rooms = new Map([
  [2, { id: 2, x: 3, y: 0, z: 0 } as any],
  [3, { id: 3, x: 1, y: 2, z: 0 } as any],
  [4, { id: 4, x: 2, y: -1, z: 0 } as any],
]);

function stubLocalStorage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  const localStorage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
  vi.stubGlobal('localStorage', localStorage);
  return { values, localStorage };
}

describe('ZC walker exit ranking', () => {
  it('uses only exits reported as open by GMCP', () => {
    const ranked = rankOpenExits(current, target, 'east', ['north', 'south'], (id) => rooms.get(id) ?? null);

    expect(ranked.map((candidate) => candidate.direction)).toEqual(['south', 'north']);
  });

  it('recognises short and Polish direction names from GMCP', () => {
    const ranked = rankOpenExits(current, target, 'east', ['e', 'poludnie'], (id) => rooms.get(id) ?? null);

    expect(ranked.map((candidate) => candidate.direction)).toEqual(['east', 'south']);
  });

  it('ranks alternatives by direction angle before coordinate distance', () => {
    const currentRoom = {
      id: 1,
      x: 0,
      y: 0,
      z: 0,
      exits: { northwest: 2, west: 3, southeast: 4 },
    } as any;
    const targetRoom = { id: 99, x: 0, y: 100, z: 0, exits: {} } as any;
    const candidateRooms = new Map([
      [2, { id: 2, x: -10, y: 10, z: 0 } as any],
      [3, { id: 3, x: -1, y: 0, z: 0 } as any],
      // Deliberately closest by map coordinates, but opposite to preferred north.
      [4, { id: 4, x: 0, y: 99, z: 0 } as any],
    ]);

    const ranked = rankOpenExits(
      currentRoom,
      targetRoom,
      'north',
      ['northwest', 'west', 'southeast'],
      (id) => candidateRooms.get(id) ?? null,
    );

    expect(ranked.map((candidate) => candidate.direction)).toEqual(['northwest', 'west', 'southeast']);
  });
});

describe('ZC walker manual stepping', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('accepts an automatic target from another core-plugin module', async () => {
    vi.useFakeTimers();
    const room1 = { id: 1, name: 'start', area: 52, x: 0, y: 0, z: 0, exits: { east: 99 } } as any;
    const room99 = { id: 99, name: 'target', area: 52, x: 1, y: 0, z: 0, exits: {} } as any;
    const mock = createMockApi({ room: room1 });
    mock.api.map.getRoomById = vi.fn((id) => (id === 99 ? room99 : room1));
    mock.api.map.findPath = vi.fn(() => [1, 99]) as any;
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 52, areaName: 'Ziemie Czaszki', rooms: [] }]) as any;
    mock.api.gmcp.get = vi.fn(() => ({ room: { info: { exits: ['east'] } } })) as any;
    setupWalker(mock.api);

    (mock.api.events as any).emit(DYNAMIC_WALKER_START_EVENT, {
      roomId: 99,
      label: 'pbt',
      automatic: true,
    });
    await vi.advanceTimersByTimeAsync(500);

    expect(printedText(mock)).toContain('[zc] ustawiono cel: pbt (99); step! = krok, step!! = auto i5');
    expect(mock.api.command.send).toHaveBeenCalledWith('e');
  });

  it('sets a target and moves only once for each step! command', async () => {
    vi.useFakeTimers();

    const room1 = { id: 1, name: 'start', x: 0, y: 0, z: 0, exits: { east: 2 } } as any;
    const room2 = { id: 2, name: 'middle', x: 1, y: 0, z: 0, exits: { east: 99 } } as any;
    const room99 = { id: 99, name: 'target', x: 2, y: 0, z: 0, exits: {} } as any;
    let current = room1;
    let openExits = ['east'];
    const roomById = new Map([
      [1, room1],
      [2, room2],
      [99, room99],
    ]);
    const mock = createMockApi();
    mock.api.map.getRoom = vi.fn(() => current);
    mock.api.map.getRoomById = vi.fn((id) => roomById.get(id) ?? null);
    mock.api.map.findPath = vi.fn((from, to) => {
      if (from === 1 && to === 99) return [1, 2, 99];
      if (from === 2 && to === 99) return [2, 99];
      return null;
    });
    mock.api.gmcp.get = vi.fn(() => ({ room: { info: { exits: openExits } } }));

    const cleanup = setupWalker(mock.api);
    const commandHook = mock.commandHooks[0];

    const start = mock.aliases.find((alias) => alias.pattern.test('/zcwalk 99'))!;
    start.callback('/zcwalk 99'.match(start.pattern) as RegExpMatchArray);
    expect(mock.api.command.send).not.toHaveBeenCalled();
    expect(commandHook.callback('i5')).toBeUndefined();
    expect(printedText(mock)).toContain('[zc] ustawiono cel: 99; step! = krok, step!! = auto i5');

    const step = mock.aliases.find((alias) => alias.pattern.test('step!'))!;
    step.callback('step!'.match(step.pattern) as RegExpMatchArray);
    expect(mock.api.command.send).toHaveBeenCalledTimes(1);
    expect(mock.api.command.send).toHaveBeenLastCalledWith('e');
    expect(printedText(mock)).toContain('--> e');
    const directFeedback = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([line]) => line)
      .find((line): line is MockAnsiAwareBuffer => line instanceof MockAnsiAwareBuffer && line.text === '--> e');
    expect(directFeedback?.segments).toEqual([
      { text: '--> ', state: undefined },
      { text: 'e', state: { type: 'hex', value: '#3f7255' } },
    ]);

    step.callback('step!'.match(step.pattern) as RegExpMatchArray);
    expect(mock.api.command.send).toHaveBeenCalledTimes(1);

    current = room2;
    openExits = ['east'];
    mock.api.events.emit('gmcp.room.info', {});
    await vi.advanceTimersByTimeAsync(0);
    expect(mock.api.command.send).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(mock.api.command.send).toHaveBeenCalledTimes(1);

    step.callback('step!'.match(step.pattern) as RegExpMatchArray);
    expect(mock.api.command.send).toHaveBeenCalledTimes(2);
    expect(mock.api.command.send).toHaveBeenLastCalledWith('e');

    cleanup();
  });

  it('starts automatic i5-paced stepping with step!!', async () => {
    vi.useFakeTimers();
    const room1 = { id: 1, name: 'start', x: 0, y: 0, z: 0, exits: { east: 2 } } as any;
    const room2 = { id: 2, name: 'middle', x: 1, y: 0, z: 0, exits: { east: 99 } } as any;
    const room99 = { id: 99, name: 'target', x: 2, y: 0, z: 0, exits: {} } as any;
    let current = room1;
    const roomById = new Map([
      [1, room1],
      [2, room2],
      [99, room99],
    ]);
    const mock = createMockApi();
    mock.api.map.getRoom = vi.fn(() => current);
    mock.api.map.getRoomById = vi.fn((id) => roomById.get(id) ?? null);
    mock.api.map.findPath = vi.fn((from) => (from === 1 ? [1, 2, 99] : [2, 99]));
    mock.api.gmcp.get = vi.fn(() => ({ room: { info: { exits: ['east'] } } }));

    const cleanup = setupWalker(mock.api);
    const start = mock.aliases.find((alias) => alias.pattern.test('/zcwalk 99'))!;
    const autoStep = mock.aliases.find((alias) => alias.pattern.test('step!!'))!;
    start.callback('/zcwalk 99'.match(start.pattern) as RegExpMatchArray);
    autoStep.callback('step!!'.match(autoStep.pattern) as RegExpMatchArray);
    expect(mock.api.command.send).toHaveBeenCalledExactlyOnceWith('e');

    current = room2;
    mock.api.events.emit('gmcp.room.info', {});
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(499);
    expect(mock.api.command.send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(mock.api.command.send).toHaveBeenCalledTimes(2);
    expect(mock.api.command.send).toHaveBeenLastCalledWith('e');

    expect(mock.commandHooks[0].callback('prr')).toBeUndefined();
    expect(printedText(mock)).toContain('[zc] zatrzymano');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(mock.api.command.send).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it('stops automatic walking after two round trips between the same rooms', async () => {
    vi.useFakeTimers();
    const roomA = {
      id: 1,
      name: 'A',
      x: 0,
      y: 0,
      z: 0,
      exits: { north: 99, east: 2 },
      specialExits: {},
    } as any;
    const roomB = {
      id: 2,
      name: 'B',
      x: 1,
      y: 0,
      z: 0,
      exits: { north: 99, west: 1 },
      specialExits: {},
    } as any;
    const targetRoom = { id: 99, name: 'target', x: 0, y: 10, z: 0, exits: {} } as any;
    const roomById = new Map([
      [1, roomA],
      [2, roomB],
      [99, targetRoom],
    ]);
    let current = roomA;
    const mock = createMockApi();
    mock.api.map.getRoom = vi.fn(() => current);
    mock.api.map.getRoomById = vi.fn((id) => roomById.get(id) ?? null);
    mock.api.map.findPath = vi.fn((from) => [from, 99]);
    mock.api.gmcp.get = vi.fn(() => ({
      room: { info: { exits: current.id === 1 ? ['east'] : ['west'] } },
    }));

    const cleanup = setupWalker(mock.api);
    const start = mock.aliases.find((alias) => alias.pattern.test('/zcwalk 99'))!;
    const autoStep = mock.aliases.find((alias) => alias.pattern.test('step!!'))!;
    start.callback('/zcwalk 99'.match(start.pattern) as RegExpMatchArray);
    autoStep.callback('step!!'.match(autoStep.pattern) as RegExpMatchArray);
    expect(mock.api.command.send).toHaveBeenLastCalledWith('e');

    for (const nextRoom of [roomB, roomA, roomB]) {
      current = nextRoom;
      mock.api.events.emit('gmcp.room.info', {});
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(500);
    }
    expect(mock.api.command.send).toHaveBeenCalledTimes(4);
    expect(mock.api.command.send).toHaveBeenLastCalledWith('w');

    current = roomA;
    mock.api.events.emit('gmcp.room.info', {});
    await vi.advanceTimersByTimeAsync(0);
    expect(printedText(mock)).toContain('[zc] petla 1 <-> 2; automat zatrzymany, cel pozostaje ustawiony');
    await vi.advanceTimersByTimeAsync(2_000);
    expect(mock.api.command.send).toHaveBeenCalledTimes(4);
    cleanup();
  });

  it('diagnoses a closed preferred exit and takes the best open alternative', () => {
    vi.useFakeTimers();
    const room1 = {
      id: 1,
      name: 'start',
      x: 0,
      y: 0,
      z: 0,
      exits: { east: 2, north: 3 },
    } as any;
    const room2 = { id: 2, name: 'route', x: 1, y: 0, z: 0, exits: {} } as any;
    const room3 = { id: 3, name: 'alternative', x: 0, y: 1, z: 0, exits: {} } as any;
    const room99 = { id: 99, name: 'target', x: 3, y: 0, z: 0, exits: {} } as any;
    const roomById = new Map([
      [1, room1],
      [2, room2],
      [3, room3],
      [99, room99],
    ]);
    const mock = createMockApi({ room: room1 });
    mock.api.map.getRoomById = vi.fn((id) => roomById.get(id) ?? null);
    mock.api.map.findPath = vi.fn(() => [1, 2, 99]);
    mock.api.gmcp.get = vi.fn(() => ({ room: { info: { exits: ['north'] } } }));

    const cleanup = setupWalker(mock.api);
    const start = mock.aliases.find((alias) => alias.pattern.test('/zcwalk 99'))!;
    const step = mock.aliases.find((alias) => alias.pattern.test('step!'))!;
    start.callback('/zcwalk 99'.match(start.pattern) as RegExpMatchArray);
    step.callback('step!'.match(step.pattern) as RegExpMatchArray);

    expect(mock.api.command.send).toHaveBeenCalledExactlyOnceWith('n');
    expect(printedText(mock)).toContain('--> n (e)');
    const alternativeFeedback = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([line]) => line)
      .find((line): line is MockAnsiAwareBuffer => line instanceof MockAnsiAwareBuffer && line.text === '--> n (e)');
    expect(alternativeFeedback?.segments).toEqual([
      { text: '--> ', state: undefined },
      { text: 'n', state: { type: 'hex', value: '#8f4a4a' } },
      { text: ' (', state: undefined },
      { text: 'e', state: { type: 'hex', value: '#8f4a4a' } },
      { text: ')', state: undefined },
    ]);
    cleanup();
  });

  it('uses a special exit to the findPath room instead of a vector alternative', () => {
    vi.useFakeTimers();
    const room13774 = {
      id: 13774,
      name: 'Nad rzeka',
      x: 304,
      y: 36,
      z: 0,
      exits: { northeast: 13800, down: 20812 },
      specialExits: { szczelina: 20812 },
      userData: { dir_bind: 'down=szczelina&south=szczelina' },
    } as any;
    const room13800 = { id: 13800, name: 'NE', x: 305, y: 37, z: 0, exits: {} } as any;
    const room20812 = { id: 20812, name: 'Przed szczelina', x: 304, y: 36, z: -1, exits: {} } as any;
    const roomById = new Map([
      [13774, room13774],
      [13800, room13800],
      [20812, room20812],
    ]);
    const mock = createMockApi({ room: room13774 });
    mock.api.map.getRoomById = vi.fn((id) => roomById.get(id) ?? null);
    mock.api.map.findPath = vi.fn(() => [13774, 20812]);
    mock.api.gmcp.get = vi.fn(() => ({ room: { info: { exits: ['northeast'] } } }));

    const cleanup = setupWalker(mock.api);
    const start = mock.aliases.find((alias) => alias.pattern.test('/zcwalk 20812'))!;
    const step = mock.aliases.find((alias) => alias.pattern.test('step!'))!;
    start.callback('/zcwalk 20812'.match(start.pattern) as RegExpMatchArray);
    step.callback('step!'.match(step.pattern) as RegExpMatchArray);

    expect(mock.api.command.send).toHaveBeenCalledExactlyOnceWith('szczelina');
    expect(printedText(mock)).toContain('--> szczelina');
    expect(printedText(mock)).not.toContain('--> ne (d)');
    cleanup();
  });

  it('uses the known hidden north exit in room 20841 when GMCP omits it', () => {
    vi.useFakeTimers();
    const room20841 = {
      id: 20841,
      name: '20841',
      x: 345,
      y: -8,
      z: 0,
      exits: { north: 20842, south: 20840 },
      specialExits: {},
    } as any;
    const room20842 = { id: 20842, name: '20842', x: 345, y: -7, z: 0, exits: {} } as any;
    const room20840 = { id: 20840, name: '20840', x: 345, y: -9, z: 0, exits: {} } as any;
    const roomById = new Map([
      [20840, room20840],
      [20841, room20841],
      [20842, room20842],
    ]);
    const mock = createMockApi({ room: room20841 });
    mock.api.map.getRoomById = vi.fn((id) => roomById.get(id) ?? null);
    mock.api.map.findPath = vi.fn(() => [20841, 20842]);
    mock.api.gmcp.get = vi.fn(() => ({ room: { info: { exits: ['south'] } } }));

    const cleanup = setupWalker(mock.api);
    const start = mock.aliases.find((alias) => alias.pattern.test('/zcwalk 20842'))!;
    const step = mock.aliases.find((alias) => alias.pattern.test('step!'))!;
    start.callback('/zcwalk 20842'.match(start.pattern) as RegExpMatchArray);
    step.callback('step!'.match(step.pattern) as RegExpMatchArray);

    expect(mock.api.command.send).toHaveBeenCalledExactlyOnceWith('n');
    expect(printedText(mock)).toContain('--> n');
    expect(printedText(mock)).not.toContain('--> s (n)');
    cleanup();
  });

  it('uses the known hidden south exit in room 20842 when GMCP omits it', () => {
    vi.useFakeTimers();
    const room20841 = { id: 20841, name: '20841', x: 345, y: -8, z: 0, exits: {} } as any;
    const room20842 = {
      id: 20842,
      name: '20842',
      x: 345,
      y: -10,
      z: 0,
      exits: { north: 20843, south: 20841 },
      specialExits: {},
    } as any;
    const room20843 = { id: 20843, name: '20843', x: 345, y: -11, z: 0, exits: {} } as any;
    const roomById = new Map([
      [20841, room20841],
      [20842, room20842],
      [20843, room20843],
    ]);
    const mock = createMockApi({ room: room20842 });
    mock.api.map.getRoomById = vi.fn((id) => roomById.get(id) ?? null);
    mock.api.map.findPath = vi.fn(() => [20842, 20841]);
    mock.api.gmcp.get = vi.fn(() => ({ room: { info: { exits: ['north'] } } }));

    const cleanup = setupWalker(mock.api);
    const start = mock.aliases.find((alias) => alias.pattern.test('/zcwalk 20841'))!;
    const step = mock.aliases.find((alias) => alias.pattern.test('step!'))!;
    start.callback('/zcwalk 20841'.match(start.pattern) as RegExpMatchArray);
    step.callback('step!'.match(step.pattern) as RegExpMatchArray);

    expect(mock.api.command.send).toHaveBeenCalledExactlyOnceWith('s');
    expect(printedText(mock)).toContain('--> s');
    expect(printedText(mock)).not.toContain('--> n (s)');
    cleanup();
  });

  it('routes a saved wk shortcut through the built-in walker while in Ziemie Czaszki', () => {
    const room1 = { id: 1, area: 12, name: 'start', x: 0, y: 0, z: 0, exits: { east: 22759 } } as any;
    stubLocalStorage({
      shortcuts: JSON.stringify([{ key: 'home', id: 22759, label: 'Pokoik w Kle' }]),
    });

    const mock = createMockApi({ room: room1 });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 12, areaName: 'Ziemie Czaszki', rooms: [] }]) as any;
    mock.api.gmcp.get = vi.fn(() => ({ char: { info: { name: 'Jens' } } }));

    const cleanup = setupWalker(mock.api);
    expect(mock.commandHooks[0].callback('wk home')).toBeNull();
    expect(vi.mocked(mock.api.command.send).mock.calls.map(([command]) => command)).toEqual([
      '/walk',
      '/prowadz 22759',
      '/idz 22759 0.5',
      '/walkerw',
    ]);
    cleanup();
  });

  it('disables /walk again once the built-in walker arrives at the wk target', () => {
    const room1 = { id: 1, area: 12, name: 'start', x: 0, y: 0, z: 0, exits: { east: 22759 } } as any;
    stubLocalStorage({
      shortcuts: JSON.stringify([{ key: 'home', id: 22759, label: 'Pokoik w Kle' }]),
    });

    const mock = createMockApi({ room: room1 });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 12, areaName: 'Ziemie Czaszki', rooms: [] }]) as any;
    mock.api.gmcp.get = vi.fn(() => ({ char: { info: { name: 'Jens' } } }));

    const cleanup = setupWalker(mock.api);
    expect(mock.commandHooks[0].callback('wk home')).toBeNull();
    expect(vi.mocked(mock.api.command.send).mock.calls.map(([command]) => command)).toEqual([
      '/walk',
      '/prowadz 22759',
      '/idz 22759 0.5',
      '/walkerw',
    ]);

    (mock.api.events as any).emit('walker.update', { active: true, paused: false, path: [], currentIndex: 0, target: 22759, delay: 0.5 });
    (mock.api.events as any).emit('walker.update', { active: false, paused: false, path: [], currentIndex: 0, target: null, delay: 0.5 });

    expect(vi.mocked(mock.api.command.send).mock.calls.map(([command]) => command)).toEqual([
      '/walk',
      '/prowadz 22759',
      '/idz 22759 0.5',
      '/walkerw',
      '/walk',
    ]);
    cleanup();
  });

  it('routes wk through the built-in walker in Pustkowia - okolice', () => {
    const room13191 = { id: 13191, area: 62, name: '13191', x: 265, y: 67, z: 1, exits: {} } as any;
    stubLocalStorage({
      shortcuts: JSON.stringify([{ key: 'up', id: 13192, label: 'Wyzej' }]),
    });
    const mock = createMockApi({ room: room13191 });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 62, areaName: 'Pustkowia - okolice', rooms: [] }]) as any;
    mock.api.gmcp.get = vi.fn(() => ({ char: { info: { name: 'Jens' } } }));

    const cleanup = setupWalker(mock.api);
    expect(mock.commandHooks[0].callback('wk up')).toBeNull();
    expect(vi.mocked(mock.api.command.send).mock.calls.map(([command]) => command)).toEqual([
      '/walk',
      '/prowadz 13192',
      '/idz 13192 0.5',
      '/walkerw',
    ]);
    cleanup();
  });

  it('routes wk through the built-in walker in Pustkowia Chaosu', () => {
    const room13116 = { id: 13116, area: 63, name: '13116', x: 276, y: 84, z: 0, exits: {} } as any;
    stubLocalStorage({
      shortcuts: JSON.stringify([{ key: 'chaos', id: 13112, label: 'Polnoc' }]),
    });
    const mock = createMockApi({ room: room13116 });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 63, areaName: 'Pustkowia Chaosu', rooms: [] }]) as any;
    mock.api.gmcp.get = vi.fn(() => ({ char: { info: { name: 'Jens' } } }));

    const cleanup = setupWalker(mock.api);
    expect(mock.commandHooks[0].callback('wk chaos')).toBeNull();
    expect(vi.mocked(mock.api.command.send).mock.calls.map(([command]) => command)).toEqual([
      '/walk',
      '/prowadz 13112',
      '/idz 13112 0.5',
      '/walkerw',
    ]);
    cleanup();
  });

  it('only enables /walk once per session across repeated wk shortcuts', () => {
    const room1 = { id: 1, area: 12, name: 'start', x: 0, y: 0, z: 0, exits: {} } as any;
    stubLocalStorage({
      shortcuts: JSON.stringify([
        { key: 'home', id: 22759, label: 'Pokoik w Kle' },
        { key: 'b', id: 15922, label: 'Benicjooo' },
      ]),
    });
    const mock = createMockApi({ room: room1 });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 12, areaName: 'Ziemie Czaszki', rooms: [] }]) as any;
    mock.api.gmcp.get = vi.fn(() => ({ char: { info: { name: 'Jens' } } }));

    const cleanup = setupWalker(mock.api);
    expect(mock.commandHooks[0].callback('wk home')).toBeNull();
    expect(mock.commandHooks[0].callback('wk b')).toBeNull();
    expect(vi.mocked(mock.api.command.send).mock.calls.map(([command]) => command)).toEqual([
      '/walk',
      '/prowadz 22759',
      '/idz 22759 0.5',
      '/walkerw',
      '/prowadz 15922',
      '/idz 15922 0.5',
      '/walkerw',
    ]);
    cleanup();
  });

  it('starts the normal client walker outside Ziemie Czaszki', async () => {
    const room = { id: 1, area: 7, name: 'outside', x: 0, y: 0, z: 0, exits: {} } as any;
    stubLocalStorage({
      shortcuts: JSON.stringify([{ key: 'home', id: 22759, label: 'Pokoik w Kle' }]),
    });

    const mock = createMockApi({ room });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 7, areaName: 'Kaedwen', rooms: [] }]) as any;
    mock.api.gmcp.get = vi.fn(() => ({ char: { info: { name: 'Jens' } } }));
    const cleanup = setupWalker(mock.api);

    expect(mock.commandHooks[0].callback('wk home')).toBeNull();
    expect(vi.mocked(mock.api.command.send).mock.calls.map(([command]) => command)).toEqual([
      '/idz 22759 2',
      '/walkerw',
    ]);
    await Promise.resolve();
    cleanup();
  });

  it('prints shortcuts as a table with lead, walk, preview and delete actions', async () => {
    vi.useFakeTimers();
    const shortcuts = [
      { key: 'home', id: 22759, label: 'Pokoik w Kle' },
      { key: 'b', id: 15922, label: 'Benicjooo' },
      { key: 'remote', id: 99999, label: 'Inna domena' },
    ];
    const storage = stubLocalStorage({ shortcuts: JSON.stringify(shortcuts) });

    const mock = createMockApi({ room: { id: 1, area: 7 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 7, areaName: 'Kaedwen', rooms: [] }]) as any;
    mock.api.map.findPath = vi.fn((_from, to) => {
      if (to === 22759) return [1, 10, 22759];
      if (to === 15922) return [1, 15922];
      return null;
    });
    mock.api.gmcp.get = vi.fn(() => ({ char: { info: { name: 'Jens' } } }));
    const cleanup = setupWalker(mock.api);
    expect(mock.commandHooks[0].callback('wk')).toBeNull();

    const rows = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([line]) => line)
      .filter((line): line is MockAnsiAwareBuffer => line instanceof MockAnsiAwareBuffer);
    expect(rows.map((row) => row.text)).toEqual([
      '+------+-------+--------+--------------+-------------+---------+----+----+',
      '| b    | 15922 | 1 lok. | Benicjooo    | [ prowadz ] | [ idz ] | 👁 | 🗑 |',
      '| home | 22759 | 2 lok. | Pokoik w Kle | [ prowadz ] | [ idz ] | 👁 | 🗑 |',
      '+------+-------+--------+--------------+-------------+---------+----+----+',
    ]);
    const homeRow = rows.find((row) => row.text.includes('| home |'))!;
    expect(homeRow.segments.find((segment) => segment.text === 'home')?.state).toMatchObject({ value: '#2f855a' });
    expect(homeRow.segments.find((segment) => segment.text === '[ prowadz ]')?.state).toMatchObject({
      value: '#4f8a65',
      underline: true,
    });
    expect(homeRow.segments.find((segment) => segment.text === '[ idz ]')?.state).toMatchObject({
      value: '#b08b57',
      underline: true,
    });
    expect(homeRow.segments.find((segment) => segment.text === '👁')?.state).toMatchObject({ value: '#607d9b' });
    expect(homeRow.segments.find((segment) => segment.text === '🗑')?.state).toMatchObject({ value: '#8f4a4a' });

    homeRow.klik('[ prowadz ]');
    homeRow.klik('[ idz ]');
    homeRow.klik('👁');
    await vi.advanceTimersByTimeAsync(2_000);
    expect(vi.mocked(mock.api.command.send).mock.calls.map(([command]) => command)).toEqual([
      '/prowadz 22759',
      '/idz 22759 2',
      '/walkerw',
      '/ustaw 22759',
      '/ustaw 1',
    ]);

    homeRow.klik('🗑');
    expect(JSON.parse(storage.values.get('p:walker:shortcuts:jens')!)).toEqual([
      { key: 'b', id: 15922, label: 'Benicjooo' },
      { key: 'remote', id: 99999, label: 'Inna domena' },
    ]);
    expect(printedText(mock)).toContain('[walker] usunieto skrot home: Pokoik w Kle (22759)');

    const printedBorders = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([line]) => line)
      .filter((line): line is MockAnsiAwareBuffer => line instanceof MockAnsiAwareBuffer && line.text.startsWith('+'))
      .map((line) => line.text);
    expect(printedBorders).toEqual([
      '+------+-------+--------+--------------+-------------+---------+----+----+',
      '+------+-------+--------+--------------+-------------+---------+----+----+',
      '+---+-------+--------+-----------+-------------+---------+----+----+',
      '+---+-------+--------+-----------+-------------+---------+----+----+',
    ]);
    expect(JSON.parse(storage.values.get('shortcuts')!)).toEqual([
      { key: 'b', id: 15922, label: 'Benicjooo' },
      { key: 'remote', id: 99999, label: 'Inna domena' },
    ]);
    cleanup();
  });

  it('shows unreachable shortcuts in wk_all and lets them be deleted', () => {
    const shortcuts = [
      { key: 'home', id: 22759, label: 'Pokoik w Kle' },
      { key: 'remote', id: 99999, label: 'Inna domena' },
    ];
    const storage = stubLocalStorage({ shortcuts: JSON.stringify(shortcuts) });
    const mock = createMockApi({ room: { id: 1, area: 7 } });
    mock.api.map.findPath = vi.fn((_from, to) => (to === 22759 ? [1, 10, 22759] : null));
    mock.api.gmcp.get = vi.fn(() => ({ char: { info: { name: 'Gertruda' } } }));

    const cleanup = setupWalker(mock.api);
    expect(mock.commandHooks[0].callback('wk_all')).toBeNull();

    const rows = (vi.mocked(mock.api.output.print).mock.calls as unknown[][])
      .map(([line]) => line)
      .filter((line): line is MockAnsiAwareBuffer => line instanceof MockAnsiAwareBuffer);
    const remoteRow = rows.find((row) => row.text.includes('| remote |'))!;
    expect(remoteRow.text).toContain('|      - | Inna domena  |');

    remoteRow.klik('🗑');
    expect(JSON.parse(storage.values.get('p:walker:shortcuts:gertruda')!)).toEqual([
      { key: 'home', id: 22759, label: 'Pokoik w Kle' },
    ]);
    expect(JSON.parse(storage.values.get('shortcuts')!)).toEqual([{ key: 'home', id: 22759, label: 'Pokoik w Kle' }]);
    cleanup();
  });

  it('replaces client shortcuts with the current character shortcuts', () => {
    const jensShortcuts = [{ key: 'j', id: 10, label: 'Jensowe' }];
    const gertrudaShortcuts = [{ key: 'g', id: 20, label: 'Gertrudowe' }];
    const storage = stubLocalStorage({
      'p:walker:shortcuts:jens': JSON.stringify(jensShortcuts),
      'p:walker:shortcuts:gertruda': JSON.stringify(gertrudaShortcuts),
      'p:walker:shortcuts:migrated': 'jens,gertruda',
      shortcuts: JSON.stringify([{ key: 'old', id: 1, label: 'Stare' }]),
    });
    let character = 'Jens';
    const mock = createMockApi();
    mock.api.gmcp.get = vi.fn(() => ({ char: { info: { name: character } } }));

    const cleanup = setupWalker(mock.api);
    expect(JSON.parse(storage.values.get('shortcuts')!)).toEqual(jensShortcuts);

    character = 'Gertruda';
    mock.api.events.emit('gmcp.char.info', { name: character });
    expect(JSON.parse(storage.values.get('shortcuts')!)).toEqual(gertrudaShortcuts);
    cleanup();
  });

  it('adds the current room with wk+ and an optional custom label', () => {
    const room = { id: 22759, area: 12, name: 'Nazwa z mapy', x: 0, y: 0, z: 0, exits: {} } as any;
    const storage = stubLocalStorage({
      shortcuts: JSON.stringify([{ key: 'market', id: 100, label: 'Targ' }]),
    });

    const mock = createMockApi({ room });
    mock.api.gmcp.get = vi.fn(() => ({ char: { info: { name: 'Jens' } } }));
    const cleanup = setupWalker(mock.api);
    expect(mock.commandHooks[0].callback('wk+ home Pokoik w Kle')).toBeNull();

    expect(JSON.parse(storage.values.get('p:walker:shortcuts:jens')!)).toEqual([
      { key: 'market', id: 100, label: 'Targ' },
      { key: 'home', id: 22759, label: 'Pokoik w Kle' },
    ]);
    expect(JSON.parse(storage.values.get('p:walker:shortcuts:gertruda')!)).toEqual([
      { key: 'market', id: 100, label: 'Targ' },
    ]);
    expect(JSON.parse(storage.values.get('shortcuts')!)).toEqual([
      { key: 'market', id: 100, label: 'Targ' },
      { key: 'home', id: 22759, label: 'Pokoik w Kle' },
    ]);
    expect(mock.api.command.send).toHaveBeenCalledWith('/dodaj_skrot 22759 "home" Pokoik w Kle');
    expect(printedText(mock)).toContain('[walker] zapisano skrot home: Pokoik w Kle (22759)');
    cleanup();
  });
});
