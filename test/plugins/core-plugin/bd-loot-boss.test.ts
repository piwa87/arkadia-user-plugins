import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupBd } from '../../../src/plugins/core-plugin/walka/bd';
import { setupBossLoot } from '../../../src/plugins/core-plugin/loot-boss';
import { createMockApi, runLine } from '../../helpers/mockApi';

function alias(mock: ReturnType<typeof createMockApi>, command: string) {
  const a = mock.aliases.find(a => a.pattern.test(command));
  expect(a).toBeDefined();
  a!.callback(command.match(a!.pattern)!);
}

describe('boss loot', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('arms one loot sequence, replaces prior arming and ignores subsequent deaths', () => {
    const mock = createMockApi();
    setupBossLoot(mock.api);
    runLine(mock, 'Smok umarl.');
    alias(mock, 'b+');
    alias(mock, 'b+');
    runLine(mock, 'Smok walczy.');
    expect(mock.api.command.send).not.toHaveBeenCalled();
    runLine(mock, 'Smok umarl.');
    runLine(mock, 'Ork umarl.');
    expect(mock.api.command.send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(34);
    expect(vi.mocked(mock.api.command.send).mock.calls.map(c => c[0])).toEqual([
      'wez wszystko z ciala', 'wez bronie', 'wez wszystkie zbroje', 'skk',
    ]);
  });

  it('cancels a pending loot timer on unload', () => {
    const mock = createMockApi();
    const cleanup = setupBossLoot(mock.api);
    alias(mock, 'b+');
    runLine(mock, 'Smok umarl.');
    cleanup();
    vi.runAllTimers();
    expect(mock.api.command.send).not.toHaveBeenCalled();
    expect(mock.tokenTriggers).toEqual([]);
  });
});

describe('bd', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  function setup() {
    const mock = createMockApi();
    vi.mocked(mock.api.objects.getObjectsOnLocation).mockReturnValue([
      ...[1, 2, 3, 4, 5].map(num => ({ num, __category: 'rest' as const })),
      { num: 6, __category: 'team' }, { num: 7, __category: 'rest-noncombat' },
    ]);
    const cleanup = setupBd(mock.api);
    return { mock, cleanup };
  }

  it('counts enemies, advances on own/team kills, counts kills during cooldown and stops at the limit', () => {
    const { mock } = setup();
    mock.api.events.emit('kill', { killer: 'ME' });
    expect(mock.api.command.send).not.toHaveBeenCalled();
    alias(mock, 'bd');
    expect(mock.api.command.send).toHaveBeenLastCalledWith('sig Lejemy do: 5');
    mock.api.events.emit('kill', { killer: 'OTHER' });
    mock.api.events.emit('kill', { killer: 'TEAM' });
    expect(mock.api.command.send).toHaveBeenLastCalledWith('sig Bije kolejnego! [2]');
    vi.advanceTimersByTime(555);
    expect(mock.api.command.send).toHaveBeenLastCalledWith('c1');
    mock.api.events.emit('kill', { killer: 'ME' });
    vi.advanceTimersByTime(4445);
    mock.api.events.emit('kill', { killer: 'ME' });
    expect(mock.api.command.send).toHaveBeenLastCalledWith('sig Bije kolejnego! [4]');
    vi.advanceTimersByTime(5000);
    mock.api.events.emit('kill', { killer: 'TEAM' });
    vi.advanceTimersByTime(5000);
    mock.api.events.emit('kill', { killer: 'ME' });
    vi.runAllTimers();
    expect(vi.mocked(mock.api.command.send).mock.calls.filter(c => c[0] === 'c1')).toHaveLength(3);
  });

  it.each(['bd-', 'mapMove', 'cleanup'])('cancels pending attacks with %s', action => {
    const { mock, cleanup } = setup();
    alias(mock, 'bd');
    mock.api.events.emit('kill', { killer: 'ME' });
    if (action === 'bd-') alias(mock, action);
    else if (action === 'mapMove') mock.api.events.emit('mapMove');
    else cleanup();
    vi.runAllTimers();
    mock.api.events.emit('kill', { killer: 'ME' });
    vi.runAllTimers();
    expect(mock.api.command.send).not.toHaveBeenCalledWith('c1');
    cleanup();
    expect([...mock.eventListeners.values()].flat()).toEqual([]);
  });
});
