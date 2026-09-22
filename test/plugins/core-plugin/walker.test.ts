import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  WALKER_ROUTE_ARRIVED_EVENT,
  WALKER_ROUTE_START_EVENT,
  setupWalker,
} from '../../../src/plugins/core-plugin/movement/walker';
import { createMockApi, MockAnsiAwareBuffer } from '../../helpers/mockApi';

function printedText(mock: ReturnType<typeof createMockApi>): string[] {
  return (vi.mocked(mock.api.output.print).mock.calls as unknown[][]).map(([line]) =>
    line instanceof MockAnsiAwareBuffer ? line.text : String(line),
  );
}

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

describe('client walker shortcuts', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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

  it('routes a troll trip through the same client walker and confirms arrival after settling', async () => {
    vi.useFakeTimers();
    let currentRoomId = 1;
    const mock = createMockApi();
    mock.api.map.getRoom = vi.fn(() => ({ id: currentRoomId, area: 12 })) as any;
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 12, areaName: 'Ziemie Czaszki', rooms: [] }]) as any;
    const cleanup = setupWalker(mock.api);

    (mock.api.events as any).emit(WALKER_ROUTE_START_EVENT, { roomId: 22759 });
    expect(vi.mocked(mock.api.command.send).mock.calls.map(([command]) => command)).toEqual([
      '/walk', '/prowadz 22759', '/idz 22759 0.5', '/walkerw',
    ]);
    (mock.api.events as any).emit('walker.update', { active: true, paused: false, path: [], currentIndex: 0, target: 22759, delay: 0.5 });
    currentRoomId = 22759;
    (mock.api.events as any).emit('walker.update', { active: false, paused: false, path: [], currentIndex: 0, target: null, delay: 0.5 });
    expect(mock.api.events.emit).not.toHaveBeenCalledWith(WALKER_ROUTE_ARRIVED_EVENT, expect.anything());
    await vi.advanceTimersByTimeAsync(1500);
    expect(mock.api.events.emit).toHaveBeenCalledWith(WALKER_ROUTE_ARRIVED_EVENT, { roomId: 22759 });
    expect(mock.api.command.send).toHaveBeenLastCalledWith('/walk');
    cleanup();
  });

  it('sets a troll target without starting either walker when its ID is clicked', () => {
    const mock = createMockApi({ room: { id: 1, area: 12 } });
    const cleanup = setupWalker(mock.api);

    (mock.api.events as any).emit(WALKER_ROUTE_START_EVENT, { roomId: 22759, automatic: false });
    expect(mock.api.command.send).toHaveBeenCalledExactlyOnceWith('/prowadz 22759');
    expect(mock.aliases.some(({ pattern }) => ['/zcwalk 22759', 'step!', 'step!!', '/zcstop'].some((command) => pattern.test(command)))).toBe(false);
    cleanup();
  });

  it('restarts an unfinished route from the actual room and reports arrival only at the target', async () => {
    vi.useFakeTimers();
    let currentRoomId = 1;
    const mock = createMockApi();
    mock.api.map.getRoom = vi.fn(() => ({ id: currentRoomId, area: 12 })) as any;
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 12, areaName: 'Ziemie Czaszki', rooms: [] }]) as any;
    mock.api.map.findPath = vi.fn((from, to) => [from, to]);
    const cleanup = setupWalker(mock.api);
    const update = (active: boolean) => (mock.api.events as any).emit('walker.update', {
      active, paused: false, path: [], currentIndex: 0, target: active ? 99 : null, delay: 0.5,
    });

    (mock.api.events as any).emit(WALKER_ROUTE_START_EVENT, { roomId: 99 });
    update(true);
    currentRoomId = 95;
    update(false);
    await vi.advanceTimersByTimeAsync(1500);
    expect(mock.api.command.send).toHaveBeenCalledWith('/idz 99 0.5');
    expect(vi.mocked(mock.api.command.send).mock.calls.map(([command]) => command)).toEqual([
      '/walk', '/prowadz 99', '/idz 99 0.5', '/walkerw', '/idz 99 0.5',
    ]);
    expect(mock.api.events.emit).not.toHaveBeenCalledWith(WALKER_ROUTE_ARRIVED_EVENT, expect.anything());

    update(true);
    currentRoomId = 99;
    update(false);
    await vi.advanceTimersByTimeAsync(1500);
    expect(mock.api.events.emit).toHaveBeenCalledWith(WALKER_ROUTE_ARRIVED_EVENT, { roomId: 99 });
    expect(mock.api.command.send).toHaveBeenLastCalledWith('/walk');
    cleanup();
  });

  it('uses GMCP position when the map cursor optimistically reached the target', async () => {
    vi.useFakeTimers();
    let currentRoomId = 1;
    const mock = createMockApi();
    const rooms = [
      { id: 1, x: 1, y: 1, name: 'start', area: 12 },
      { id: 95, x: 5, y: 5, name: 'middle', area: 12 },
      { id: 99, x: 9, y: 9, name: 'target', area: 12 },
    ];
    mock.api.map.getRoom = vi.fn(() => rooms.find(({ id }) => id === currentRoomId)) as any;
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 12, areaName: 'Ziemie Czaszki', rooms }]) as any;
    mock.api.map.setLocation = vi.fn((id) => { currentRoomId = id; });
    mock.api.map.findPath = vi.fn((from, to) => [from, to]);
    mock.api.gmcp.get = vi.fn(() => ({ room: { info: { map: { x: 5, y: 5, name: 'middle' } } } }));
    const cleanup = setupWalker(mock.api);

    (mock.api.events as any).emit(WALKER_ROUTE_START_EVENT, { roomId: 99 });
    // The client can move the map cursor ahead of the server response.
    currentRoomId = 99;
    (mock.api.events as any).emit('walker.update', { active: true, paused: false, path: [], currentIndex: 0, target: 99, delay: 0.5 });
    (mock.api.events as any).emit('walker.update', { active: false, paused: false, path: [], currentIndex: 0, target: null, delay: 0.5 });
    await vi.advanceTimersByTimeAsync(1500);

    expect(mock.api.map.setLocation).toHaveBeenCalledWith(95);
    expect(mock.api.command.send).toHaveBeenCalledWith('/idz 99 0.5');
    expect(mock.api.events.emit).not.toHaveBeenCalledWith(WALKER_ROUTE_ARRIVED_EVENT, expect.anything());
    cleanup();
  });

  it('does not resume a route after /stop', async () => {
    vi.useFakeTimers();
    const mock = createMockApi({ room: { id: 1, area: 12 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 12, areaName: 'Ziemie Czaszki', rooms: [] }]) as any;
    const cleanup = setupWalker(mock.api);
    (mock.api.events as any).emit(WALKER_ROUTE_START_EVENT, { roomId: 99 });
    (mock.api.events as any).emit('walker.update', { active: true, paused: false, path: [], currentIndex: 0, target: 99, delay: 0.5 });
    (mock.api.events as any).emit('walker.update', { active: false, paused: false, path: [], currentIndex: 0, target: null, delay: 0.5 });
    expect(mock.commandHooks[0].callback('/stop')).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1500);
    expect(vi.mocked(mock.api.command.send).mock.calls.map(([command]) => command)).toEqual([
      '/walk', '/prowadz 99', '/idz 99 0.5', '/walkerw', '/walk',
    ]);
    cleanup();
  });

  it('stops retrying after three unfinished client walks', async () => {
    vi.useFakeTimers();
    const mock = createMockApi({ room: { id: 95, area: 12 } });
    mock.api.map.getAreas = vi.fn(() => [{ areaId: 12, areaName: 'Ziemie Czaszki', rooms: [] }]) as any;
    mock.api.map.findPath = vi.fn(() => [95, 99]);
    const cleanup = setupWalker(mock.api);
    (mock.api.events as any).emit(WALKER_ROUTE_START_EVENT, { roomId: 99 });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      (mock.api.events as any).emit('walker.update', { active: true, paused: false, path: [], currentIndex: 0, target: 99, delay: 0.5 });
      (mock.api.events as any).emit('walker.update', { active: false, paused: false, path: [], currentIndex: 0, target: null, delay: 0.5 });
      await vi.advanceTimersByTimeAsync(1500);
    }

    expect(vi.mocked(mock.api.command.send).mock.calls.filter(([command]) => command === '/idz 99 0.5')).toHaveLength(4);
    expect(printedText(mock)).toContain('[walker] nie dotarto do 99; obecna lokacja: 95');
    expect(mock.api.command.send).toHaveBeenLastCalledWith('/walk');
    cleanup();
  });

  it('disables /walk once the target is confirmed after a wk trip', async () => {
    vi.useFakeTimers();
    const room1 = { id: 1, area: 12, name: 'start', x: 0, y: 0, z: 0, exits: { east: 22759 } } as any;
    stubLocalStorage({
      shortcuts: JSON.stringify([{ key: 'home', id: 22759, label: 'Pokoik w Kle' }]),
    });

    let currentRoomId = 1;
    const mock = createMockApi();
    mock.api.map.getRoom = vi.fn(() => ({ ...room1, id: currentRoomId })) as any;
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
    currentRoomId = 22759;
    (mock.api.events as any).emit('walker.update', { active: false, paused: false, path: [], currentIndex: 0, target: null, delay: 0.5 });
    await vi.advanceTimersByTimeAsync(1500);

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
