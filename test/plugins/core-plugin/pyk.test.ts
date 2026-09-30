import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockApi, runLine } from '../../helpers/mockApi';
import { isPykEnabled, requestPykAttack, setupAtakPyk } from '../../../src/plugins/core-plugin/pyk';
import { setupPrrAlias } from '../../../src/plugins/core-plugin/misc/prr';
import { setupTeam, destroyTeam } from '../../../src/plugins/core-plugin/mod_team/team';

describe('PYK shared attack scheduler', () => {
  let mock: ReturnType<typeof createMockApi>;
  let cleanup: () => void;
  let objects: { num: number; __category: string; attack_num?: number | boolean; attack_target?: boolean }[];
  const alias = (command: string) => {
    // The mock retains removed aliases; use the latest registration after reload.
    const entry = [...mock.aliases].reverse().find(a => a.pattern.test(command))!;
    entry.callback(command.match(entry.pattern)!);
  };
  const signal = () => mock.api.events.emit('teamLeaderTargetNoAvatar', 99);
  const attacks = () => vi.mocked(mock.api.command.send).mock.calls.filter(c => c[0] === '/z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0); // 400 ms reaction, 7 s cooldown
    vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
    mock = createMockApi();
    objects = [
      { num: 1, __category: 'player', attack_num: false },
      { num: 42, __category: 'rest', attack_target: true },
    ];
    (mock.api as any).objects = { getObjectsOnLocation: () => objects };
    vi.mocked(mock.api.team.getLeaderId).mockReturnValue(2);
    cleanup = setupAtakPyk(mock.api);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('enables without attacking and expires after 15 minutes while idle', () => {
    alias('pyk+');
    expect(isPykEnabled()).toBe(true);
    vi.advanceTimersByTime(899999);
    expect(isPykEnabled()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(isPykEnabled()).toBe(false);
    expect(attacks()).toHaveLength(0);
    expect(mock.footerComponents[0].handle.setVisible).toHaveBeenLastCalledWith(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('coalesces repeated events and text, drops cooldown signals without a backlog', () => {
    alias('pyk+');
    for (let i = 0; i < 100; i++) {
      signal();
      runLine(mock, 'Vindael wskazuje trolla jako cel ataku.');
    }
    vi.advanceTimersByTime(399);
    expect(attacks()).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(attacks()).toHaveLength(1);
    for (let i = 0; i < 100; i++) signal();
    vi.advanceTimersByTime(7000);
    expect(attacks()).toHaveLength(1);
    signal();
    vi.advanceTimersByTime(400);
    expect(attacks()).toHaveLength(2);
  });

  it('ignores the leader combat target if we already attack the marked target', () => {
    alias('pyk+');
    signal(); // leader fights 99, but 42 is marked
    objects[0].attack_num = 42;
    vi.advanceTimersByTime(3400);
    expect(attacks()).toHaveLength(0);
  });

  it('rechecks the latest marked target when it changes during the reaction', () => {
    alias('pyk+');
    objects[0].attack_num = 42;
    signal();
    objects[1].attack_target = false;
    objects.push({ num: 43, __category: 'rest', attack_target: true });
    vi.advanceTimersByTime(400);
    expect(attacks()).toHaveLength(1);
    expect(mock.api.command.send).toHaveBeenCalledWith('/z', false);
  });

  it('also respects the longest reaction and cooldown under continuous events', () => {
    vi.mocked(Math.random).mockReturnValue(0.999999);
    alias('pyk+');
    signal();
    vi.advanceTimersByTime(3399);
    expect(attacks()).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(attacks()).toHaveLength(1);
    for (let i = 0; i < 109; i++) {
      vi.advanceTimersByTime(100);
      signal();
    }
    expect(attacks()).toHaveLength(1);
    vi.advanceTimersByTime(100);
    signal();
    vi.advanceTimersByTime(3400);
    expect(attacks()).toHaveLength(2);
  });

  it.each(['missing target', 'missing player', 'no leader', 'leader is me', 'team target'])(
    'does not attack with %s at execution time', reason => {
      alias('pyk+');
      signal();
      if (reason === 'missing target') objects.pop();
      if (reason === 'missing player') objects.shift();
      if (reason === 'no leader') vi.mocked(mock.api.team.getLeaderId).mockReturnValue(undefined);
      if (reason === 'leader is me') vi.mocked(mock.api.team.getLeaderId).mockReturnValue(1);
      if (reason === 'team target') objects[1].__category = 'team';
      vi.advanceTimersByTime(3400);
      expect(attacks()).toHaveLength(0);
    },
  );

  it('cancels pending reactions on off/on without reviving them', () => {
    alias('pyk+');
    signal();
    alias('pyk-');
    alias('pyk+');
    vi.advanceTimersByTime(3400);
    expect(attacks()).toHaveLength(0);
  });

  it('resets cooldown on off/on', () => {
    alias('pyk+');
    signal();
    vi.advanceTimersByTime(400);
    expect(attacks()).toHaveLength(1);
    alias('pyk-');
    expect(vi.getTimerCount()).toBe(0);
    alias('pyk+');
    signal();
    vi.advanceTimersByTime(400);
    expect(attacks()).toHaveLength(2);
  });

  it('renews the session on pyk+ without resetting an active cooldown', () => {
    alias('pyk+');
    signal();
    vi.advanceTimersByTime(400);
    alias('pyk+');
    signal();
    vi.advanceTimersByTime(899600);
    expect(attacks()).toHaveLength(1);
    expect(isPykEnabled()).toBe(true);
    vi.advanceTimersByTime(400);
    expect(isPykEnabled()).toBe(false);
  });

  it.each(['pyk-', 'prr'])('%s fully resets PYK and silences subsequent signals', command => {
    setupPrrAlias(mock.api);
    // Model command dispatch for prr's nested pyk- alias.
    vi.mocked(mock.api.command.send).mockImplementation(async text => {
      if (text === 'pyk-') alias(text);
    });
    alias('pyk+');
    signal();
    alias(command);
    expect(isPykEnabled()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    vi.mocked(mock.api.output.print).mockClear();
    vi.mocked(mock.api.command.send).mockClear();
    for (let i = 0; i < 10; i++) {
      signal();
      mock.api.events.emit('gmcp.objects.data', new Map());
      mock.api.events.emit('teamLeaderTargetAvatar');
      requestPykAttack();
      runLine(mock, 'Vindael wskazuje trolla jako cel ataku.');
      vi.advanceTimersByTime(5000);
    }
    expect(mock.api.command.send).not.toHaveBeenCalled();
    expect(mock.api.output.print).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['pending', 'cooldown', 'suspended tab'])('expires safely during %s', state => {
    alias('pyk+');
    vi.advanceTimersByTime(899800);
    signal();
    if (state === 'cooldown') {
      // Start an attack shortly before expiry instead.
      alias('pyk-');
      alias('pyk+');
      vi.advanceTimersByTime(898000);
      signal();
      vi.advanceTimersByTime(400);
      expect(attacks()).toHaveLength(1);
    }
    const count = attacks().length;
    if (state === 'suspended tab') vi.setSystemTime(Date.now() + 900000);
    vi.advanceTimersByTime(3400);
    expect(isPykEnabled()).toBe(false);
    expect(attacks()).toHaveLength(count);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['mapMove', 'client.disconnect'] as const)('cancels pending attacks on %s', event => {
    alias('pyk+');
    signal();
    mock.api.events.emit(event);
    vi.advanceTimersByTime(3400);
    expect(attacks()).toHaveLength(0);
  });

  it('cleans up pending timers and listeners, including after reload', () => {
    alias('pyk+');
    signal();
    cleanup();
    expect(vi.getTimerCount()).toBe(0);
    expect([...mock.eventListeners.values()].flat()).toEqual([]);
    requestPykAttack();
    cleanup = setupAtakPyk(mock.api);
    alias('pyk+');
    expect(isPykEnabled()).toBe(true);
    vi.advanceTimersByTime(3400);
    expect(attacks()).toHaveLength(0);
  });

  it('shares the reaction and cooldown with both shield-break paths', () => {
    vi.mocked(mock.api.team.getMembers).mockReturnValue(['Vindael']);
    setupTeam(mock.api);
    try {
      alias('pyk+');
      runLine(mock, 'Atakujesz trolla, lecz goblin zagradza ci droge.');
      runLine(mock, 'Vindael rzuca sie na trolla przebijajac sie przez jego ochrone.');
      signal();
      runLine(mock, 'Rzucasz sie na trolla przebijajac sie przez jego ochrone.');
      vi.advanceTimersByTime(399);
      expect(attacks()).toHaveLength(0);
      vi.advanceTimersByTime(1);
      expect(attacks()).toHaveLength(1);
      runLine(mock, 'Rzucasz sie na trolla przebijajac sie przez jego ochrone.');
      vi.advanceTimersByTime(7000);
      expect(attacks()).toHaveLength(1);
      runLine(mock, 'Rzucasz sie na trolla przebijajac sie przez jego ochrone.');
      alias('pyk-');
      vi.advanceTimersByTime(3400);
      expect(attacks()).toHaveLength(1);
      expect(vi.mocked(mock.api.command.send).mock.calls.some(c => /^c(?: |$)/.test(c[0]))).toBe(false);
    } finally {
      destroyTeam(mock.api);
    }
  });

  describe('weapon recovery', () => {
    const knockOff = () => mock.api.events.emit('weaponKnockedOff');
    const ready = () => mock.api.events.emit('canWieldAfterKnockOff');
    const draws = () => vi.mocked(mock.api.command.send).mock.calls.filter(c => c[0] === 'dob');

    it.each([[0, 400], [0.999999, 3400]])('draws once after readiness (random %s, delay %s)', (random, delay) => {
      vi.mocked(Math.random).mockReturnValue(random);
      alias('pyk+');
      knockOff();
      vi.advanceTimersByTime(15000);
      expect(draws()).toHaveLength(0);
      ready();
      ready();
      vi.advanceTimersByTime(delay - 1);
      expect(draws()).toHaveLength(0);
      vi.advanceTimersByTime(1);
      expect(draws()).toHaveLength(1);
      ready();
      vi.advanceTimersByTime(15000);
      expect(draws()).toHaveLength(1);
      mock.api.events.emit('weapon_state', true);
      knockOff();
      ready();
      vi.advanceTimersByTime(delay);
      expect(draws()).toHaveLength(2);
    });

    it('ignores readiness without a knock-off observed while PYK was enabled', () => {
      knockOff();
      ready();
      alias('pyk+');
      ready();
      vi.advanceTimersByTime(15000);
      expect(draws()).toHaveLength(0);
    });

    it('cancels pending attacks and waits for confirmation before attacking again', () => {
      alias('pyk+');
      signal();
      knockOff();
      signal();
      requestPykAttack();
      vi.advanceTimersByTime(3400);
      expect(attacks()).toHaveLength(0);
      ready();
      signal();
      vi.advanceTimersByTime(400);
      expect(draws()).toHaveLength(1);
      signal();
      vi.advanceTimersByTime(3400);
      expect(attacks()).toHaveLength(0);
      mock.api.events.emit('weapon_state', true);
      signal();
      vi.advanceTimersByTime(400);
      expect(attacks()).toHaveLength(1);
    });

    it('draws during attack cooldown without resetting that cooldown', () => {
      alias('pyk+');
      signal();
      vi.advanceTimersByTime(400);
      knockOff();
      ready();
      vi.advanceTimersByTime(400);
      expect(draws()).toHaveLength(1);
      mock.api.events.emit('weapon_state', true);
      signal();
      vi.advanceTimersByTime(400);
      expect(attacks()).toHaveLength(1);
    });

    it.each(['manual draw', 'pyk-', 'prr', 'disconnect', 'expiry', 'destroy'])('cancels recovery on %s', reason => {
      setupPrrAlias(mock.api);
      vi.mocked(mock.api.command.send).mockImplementation(async text => {
        if (text === 'pyk-') alias(text);
      });
      alias('pyk+');
      if (reason === 'expiry') vi.advanceTimersByTime(899800);
      knockOff();
      ready();
      if (reason === 'manual draw') mock.api.events.emit('weapon_state', true);
      if (reason === 'pyk-' || reason === 'prr') alias(reason);
      if (reason === 'disconnect') mock.api.events.emit('client.disconnect');
      if (reason === 'destroy') cleanup();
      vi.advanceTimersByTime(3400);
      ready();
      vi.advanceTimersByTime(3400);
      expect(draws()).toHaveLength(0);
      if (reason !== 'manual draw') expect(vi.getTimerCount()).toBe(0);
    });

    it('does not revive an old recovery after off/on', () => {
      alias('pyk+');
      knockOff();
      ready();
      alias('pyk-');
      alias('pyk+');
      ready();
      vi.advanceTimersByTime(3400);
      expect(draws()).toHaveLength(0);
      signal();
      vi.advanceTimersByTime(400);
      expect(attacks()).toHaveLength(1);
    });
  });
});
