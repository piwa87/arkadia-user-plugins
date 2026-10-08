import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocationObject } from '@arkadia/plugin-types';
import { createMockApi, runLine } from '../../../helpers/mockApi';
import { setupAtakPyk, isPykEnabled } from '../../../../src/plugins/core-plugin/pyk/pyk';
import { rebuildTeamState, resetTeamState } from '../../../../src/plugins/core-plugin/mod_team/team_state';
import { setupTeam, destroyTeam } from '../../../../src/plugins/core-plugin/mod_team/team';
import { setupPrrAlias } from '../../../../src/plugins/core-plugin/misc/prr';

describe('PYK team cover', () => {
  let mock: ReturnType<typeof createMockApi>;
  let objects: LocationObject[];
  let hp: unknown;
  let cleanup: () => void;
  const alias = (command: string) => {
    const entry = [...mock.aliases].reverse().find(a => a.pattern.test(command))!;
    entry.callback(command.match(entry.pattern)!);
  };
  const update = () => mock.api.events.emit('gmcp.objects.data', new Map());
  const covers = () => vi.mocked(mock.api.command.send).mock.calls
    .filter(([command]) => command.startsWith('zaslon ')).map(([command]) => command);
  const manual = (command: string) => {
    for (const hook of mock.commandHooks) expect(hook.callback(command)).toBeUndefined();
  };
  const fail = (who = 'Vindael', target = 'Abra') => runLine(mock,
    `${who} probuje zaslonic ${target} przed ciosami trolla, jednak nie jest w stanie tego uczynic.`,
  );
  const enemies = (theirs: number, mine = 0, target = 2) => {
    objects = objects.filter(object => object.__category !== 'rest');
    for (let i = 0; i < theirs + mine; i++) {
      objects.push({ num: 100 + i, __category: 'rest', attack_num: i < theirs ? target : 1 });
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
    mock = createMockApi();
    hp = 3; // ranny, 4/7
    objects = [
      { num: 1, desc: 'Ja', __category: 'player', hp: 3 },
      { num: 2, desc: 'Abr', __category: 'team', hp: 3 },
      { num: 3, desc: 'Vindael', __category: 'team', hp: 3 },
    ];
    mock.api.objects = { getObjectsOnLocation: () => objects };
    vi.mocked(mock.api.gmcp.get).mockImplementation(() => ({ char: { state: { hp } } }));
    vi.mocked(mock.api.team.getMembers).mockReturnValue(['Abr', 'Vindael']);
    rebuildTeamState(mock.api);
    cleanup = setupAtakPyk(mock.api);
    alias('pyk+');
  });

  afterEach(() => {
    cleanup();
    resetTeamState();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([2, 3, 4])('balances at least three extra attackers with similar HP (teammate raw HP %s)', teammateHp => {
    objects[1].hp = teammateHp;
    enemies(4, 1);
    for (let i = 0; i < 30; i++) update();
    vi.advanceTimersByTime(399);
    expect(covers()).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(covers()).toEqual(['zaslon ob_2']);
    // One attacker switches after a confirmed cover: now 3 vs 2, no repeat.
    enemies(3, 2);
    update();
    vi.advanceTimersByTime(15000);
    expect(covers()).toHaveLength(1);
  });

  it.each([1, 5, undefined])('does not balance dissimilar or unknown teammate HP (%s)', teammateHp => {
    objects[1].hp = teammateHp;
    enemies(4);
    update();
    vi.advanceTimersByTime(15000);
    expect(covers()).toEqual([]);
  });

  it('requires an actual gap of three and ignores friendly/unknown attacks', () => {
    enemies(4, 2);
    objects[2].attack_num = 2;
    objects.push({ num: 999, __category: 'rest', attack_num: true });
    update();
    vi.advanceTimersByTime(3400);
    expect(covers()).toEqual([]);
  });

  it.each([0, 1, 2, undefined, NaN, '3', 7])('blocks all rules with unsafe or unknown own HP (%s)', ownHp => {
    hp = ownHp;
    objects[1].defense_target = true;
    enemies(4);
    fail(); fail(); fail();
    update();
    vi.advanceTimersByTime(15000);
    expect(covers()).toEqual([]);
  });

  it.each([3, 4, 5, 6])('permits defense cover at own raw HP %s without similar target HP', ownHp => {
    hp = ownHp;
    objects[1].hp = 0;
    objects[1].defense_target = true;
    enemies(1, 3);
    update();
    vi.advanceTimersByTime(400);
    expect(covers()).toEqual(['zaslon ob_2']);
  });

  it.each(['no team', 'alone here', 'no player', 'no attackers', 'marked enemy', 'marked self'])('does not cover with %s', reason => {
    objects[1].defense_target = true;
    enemies(1);
    if (reason === 'no team') vi.mocked(mock.api.team.getMembers).mockReturnValue([]);
    if (reason === 'alone here') objects = objects.filter(o => o.__category !== 'team');
    if (reason === 'no player') objects.shift();
    if (reason === 'no attackers') enemies(0);
    if (reason === 'marked enemy') objects[1].__category = 'rest';
    if (reason === 'marked self') {
      objects[1].defense_target = false;
      objects[0].defense_target = true;
    }
    update();
    vi.advanceTimersByTime(15000);
    expect(covers()).toEqual([]);
  });

  it('follows a defense mark arriving after the text and rechecks it during reaction', () => {
    enemies(1);
    runLine(mock, 'Vindael wskazuje Abra jako cel obrony.');
    vi.advanceTimersByTime(100);
    objects[1].defense_target = true;
    update();
    vi.advanceTimersByTime(200);
    objects[1].defense_target = false;
    objects[2].defense_target = true;
    enemies(1, 0, 3);
    update();
    vi.advanceTimersByTime(200);
    expect(covers()).toEqual(['zaslon ob_3']);
  });

  it.each(['hurt', 'member left', 'no longer attacked', 'mark removed'])('rechecks %s even without a new event', reason => {
    objects[1].defense_target = true;
    enemies(1);
    update();
    if (reason === 'hurt') hp = 2;
    if (reason === 'member left') objects.splice(1, 1);
    if (reason === 'no longer attacked') enemies(0);
    if (reason === 'mark removed') objects[1].defense_target = false;
    vi.advanceTimersByTime(400);
    expect(covers()).toEqual([]);
  });

  it('honors the longest random reaction', () => {
    vi.mocked(Math.random).mockReturnValue(0.999999);
    enemies(4);
    update();
    vi.advanceTimersByTime(3399);
    expect(covers()).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(covers()).toEqual(['zaslon ob_2']);
  });

  it('helps once after three failures within 15 seconds even with very different HP', () => {
    objects[1].hp = 0;
    enemies(1);
    fail();
    vi.advanceTimersByTime(7000);
    fail();
    vi.advanceTimersByTime(7000);
    expect(covers()).toEqual([]);
    fail();
    vi.advanceTimersByTime(400);
    expect(covers()).toEqual(['zaslon ob_2']);
    runLine(mock, 'Probujesz zaslonic Abra przed ciosami trolla, jednak nie jestes w stanie tego uczynic.');
    mock.api.events.emit('maneuverAttempted');
    for (let i = 0; i < 5; i++) {
      update();
      vi.advanceTimersByTime(5000);
    }
    expect(covers()).toHaveLength(1);
  });

  it('counts failures from different teammates toward the same person', () => {
    vi.mocked(mock.api.team.getMembers).mockReturnValue(['Abr', 'Vindael', 'Abuan']);
    objects.push({ num: 4, desc: 'Abuan', __category: 'team' });
    rebuildTeamState(mock.api);
    enemies(1);
    fail(); fail('Abuan'); fail();
    vi.advanceTimersByTime(400);
    expect(covers()).toEqual(['zaslon ob_2']);
  });

  it('does not combine failures for different people or count non-team attempts', () => {
    enemies(1);
    fail(); fail('Vindael', 'Abuana'); fail('Troll');
    runLine(mock, 'Probujesz zaslonic Abra przed ciosami trolla, jednak nie jestes w stanie tego uczynic.');
    vi.advanceTimersByTime(400);
    expect(covers()).toEqual([]);
    fail();
    vi.advanceTimersByTime(400);
    expect(covers()).toEqual([]);
    fail();
    vi.advanceTimersByTime(400);
    expect(covers()).toEqual(['zaslon ob_2']);
  });

  it('expires failures after 15 seconds, including while a reaction is pending', () => {
    enemies(1);
    fail();
    vi.advanceTimersByTime(14900);
    fail(); fail();
    vi.advanceTimersByTime(400);
    expect(covers()).toEqual([]);
    fail();
    vi.advanceTimersByTime(400);
    expect(covers()).toEqual(['zaslon ob_2']);
  });

  it.each([
    'Vindael zrecznie zaslania Abra przed ciosami trolla.',
    'Zrecznie zaslaniasz Abra przed ciosami trolla.',
    'Na rozkaz Vindaela zaslaniasz Abra przed ciosami trolla.',
  ])('resets failure history on success: %s', line => {
    enemies(1);
    fail(); fail(); fail();
    runLine(mock, line);
    vi.advanceTimersByTime(400);
    expect(covers()).toEqual([]);
    fail(); fail();
    vi.advanceTimersByTime(400);
    expect(covers()).toEqual([]);
  });

  it('prioritizes defense mark over failure assistance and load balancing', () => {
    objects[2].defense_target = true;
    enemies(4);
    objects.push({ num: 200, __category: 'rest', attack_num: 3 });
    fail(); fail(); fail();
    update();
    vi.advanceTimersByTime(400);
    expect(covers()).toEqual(['zaslon ob_3']);
  });

  it('prioritizes failed covers over balancing attackers', () => {
    enemies(4, 0, 3);
    objects.push({ num: 200, __category: 'rest', attack_num: 2 });
    fail(); fail(); fail();
    update();
    vi.advanceTimersByTime(400);
    expect(covers()).toEqual(['zaslon ob_2']);
  });

  it('reserves cooldown before send and extends it from the game reply on a failed attempt', () => {
    objects[1].defense_target = true;
    enemies(1);
    vi.mocked(mock.api.command.send).mockImplementation(async command => {
      manual(command);
      update();
    });
    update();
    vi.advanceTimersByTime(400);
    expect(covers()).toHaveLength(1);
    vi.advanceTimersByTime(300);
    mock.api.events.emit('maneuverAttempted');
    vi.advanceTimersByTime(4999);
    expect(covers()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(covers()).toHaveLength(1);
    vi.advanceTimersByTime(400);
    expect(covers()).toHaveLength(2);
  });

  it.each(['zaslon Abra', '/za a', '/za3 b', '/prze', 'przelam obrone trolla', 'gzwycofaj sie za Abra'])(
    'cancels the automatic reaction when a manual maneuver takes over: %s', command => {
      enemies(4);
      update();
      vi.advanceTimersByTime(399);
      manual(command);
      vi.advanceTimersByTime(5000);
      expect(covers()).toEqual([]);
      vi.advanceTimersByTime(400);
      expect(covers()).toEqual(['zaslon ob_2']);
    },
  );

  it('preserves a game cooldown across off/on and observes maneuvers while disabled', () => {
    alias('pyk-');
    mock.api.events.emit('coverTimer', 5);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    enemies(4);
    alias('pyk+');
    mock.api.events.emit('coverTimer', null); // must not erase the reservation
    vi.advanceTimersByTime(3999);
    expect(covers()).toEqual([]);
    vi.advanceTimersByTime(401);
    expect(covers()).toEqual(['zaslon ob_2']);
  });

  it.each(['pyk-', 'prr', 'disconnect', 'expiry', 'destroy', 'mapMove', 'teamChange'])(
    'clears pending reaction and failure history on %s', reason => {
      setupPrrAlias(mock.api);
      enemies(1);
      if (reason === 'expiry') vi.advanceTimersByTime(899800);
      fail(); fail(); fail();
      if (reason === 'pyk-' || reason === 'prr') alias(reason);
      if (reason === 'disconnect') mock.api.events.emit('client.disconnect');
      if (reason === 'destroy') cleanup();
      if (reason === 'mapMove') mock.api.events.emit('mapMove');
      if (reason === 'teamChange') mock.api.events.emit('teamChange');
      vi.advanceTimersByTime(400);
      expect(covers()).toEqual([]);
      if (reason !== 'destroy') {
        if (!isPykEnabled()) alias('pyk+');
        fail(); fail();
        vi.advanceTimersByTime(400);
        expect(covers()).toEqual([]);
      }
    },
  );

  it('removes timers, hooks, triggers and listeners on destroy', () => {
    enemies(4);
    update();
    vi.advanceTimersByTime(400);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    cleanup();
    expect(vi.getTimerCount()).toBe(0);
    expect([...mock.eventListeners.values()].flat()).toEqual([]);
    expect(mock.commandHooks).toEqual([]);
    expect(mock.tokenTriggers).toEqual([]);
  });

  it('counts original lines even when the team module rewrites them', () => {
    setupTeam(mock.api);
    try {
      enemies(1);
      fail(); fail(); fail();
      vi.advanceTimersByTime(400);
      expect(covers()).toEqual(['zaslon ob_2']);
    } finally {
      destroyTeam(mock.api);
    }
  });
});
