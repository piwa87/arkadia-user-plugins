import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupPrrAlias } from '../../../src/plugins/core-plugin/misc/prr';
import { setupGertrudaZiizc } from '../../../src/plugins/core-plugin/gertruda/ziizc';
import { createMockApi, MockAnsiAwareBuffer, runLine } from '../../helpers/mockApi';
vi.mock('../../../src/lib/notifications', () => ({ notify: vi.fn() }));

describe('ziizc', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
  function setup() {
    const mock = createMockApi();
    vi.mocked(mock.api.command.send).mockResolvedValue(undefined);
    Object.assign(mock.api, { herbs: { getBags: () => ({}) } });
    const cleanup = setupGertrudaZiizc(mock.api);
    const alias = (text: string) => {
      const entry = mock.aliases.find(a => a.pattern.test(text))!;
      entry.callback(text.match(entry.pattern)!);
    };
    const room = (a: string, b: string) => {
      runLine(mock, 'Droga Czaszek.');
      runLine(mock, `Mozesz podazac traktem na ${a} albo ${b}. Natomiast jesli chcesz zejsc z wytyczonej drogi mozesz udac sie na poludnie.`);
      // Client.flushLines defers GMCP message events until every line was processed.
      mock.api.events.emit('gmcp_msg.room.short', new MockAnsiAwareBuffer('Droga Czaszek.') as any);
    };
    return { mock, cleanup, alias, room };
  }
  it('follows bends in both directions, searches twice per step, then packs from bag 3', () => {
    const { mock, cleanup, alias, room } = setup();
    mock.api.events.emit('command', 'sw');
    room('polnocny-wschod', 'zachod');
    alias('ziizc 2');
    expect(mock.api.command.send).toHaveBeenCalledWith('w');
    expect(mock.api.command.send).not.toHaveBeenCalledWith('szukaj ziol');
    mock.api.events.emit('command', 'w');
    room('wschod', 'poludniowy-zachod');
    vi.advanceTimersByTime(14000);
    expect(mock.api.command.send).toHaveBeenCalledWith('sw');
    mock.api.events.emit('command', 'sw');
    room('polnocny-wschod', 'zachod');
    vi.advanceTimersByTime(14000);
    const commands = vi.mocked(mock.api.command.send).mock.calls.map(c => c[0]);
    expect(commands.filter(c => c === 'szukaj ziol')).toHaveLength(4);
    expect(commands).toContain('wloz ziola do 3. woreczka');
    expect(commands).toContain('play_tink');
    expect(commands).not.toContain('s');
    cleanup();
  });
  it('also follows the road eastwards', () => {
    const { mock, alias, room, cleanup } = setup();
    mock.api.events.emit('command', 'ne');
    room('poludniowy-zachod', 'wschod');
    alias('ziizc');
    expect(mock.api.command.send).toHaveBeenCalledWith('e');
    cleanup();
  });
  it('refuses an unknown arrival direction and stops if no description arrives', () => {
    const { mock, alias, room, cleanup } = setup();
    room('wschod', 'zachod');
    alias('ziizc');
    expect(mock.api.command.send).not.toHaveBeenCalled();
    mock.api.events.emit('command', 'w');
    room('wschod', 'zachod');
    alias('ziizc');
    vi.advanceTimersByTime(30000);
    expect(mock.api.command.send).toHaveBeenCalledExactlyOnceWith('w');
    cleanup();
  });
  it.each(['stop', 'cleanup', 'manual', 'disconnect', 'prr', 'leave-road'])('cancels scheduled searches on %s', mode => {
    const { mock, alias, room, cleanup } = setup();
    mock.api.events.emit('command', 'w');
    room('wschod', 'zachod');
    alias('ziizc');
    mock.api.events.emit('command', 'w');
    room('wschod', 'zachod');
    vi.advanceTimersByTime(0);
    if (mode === 'leave-road') mock.api.events.emit('gmcp_msg.room.short', new MockAnsiAwareBuffer('Las.') as any);
    if (mode === 'prr') { setupPrrAlias(mock.api); alias('prr'); }
    if (mode === 'stop') alias('ziizc stop');
    if (mode === 'cleanup') cleanup();
    if (mode === 'manual') mock.api.events.emit('command', 's');
    if (mode === 'disconnect') mock.api.events.emit('client.disconnect');
    vi.mocked(mock.api.command.send).mockClear();
    vi.advanceTimersByTime(60000);
    expect(mock.api.command.send).not.toHaveBeenCalled();
    cleanup();
  });
});
