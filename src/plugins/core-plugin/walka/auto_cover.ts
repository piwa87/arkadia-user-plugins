import type { LocationObject, PluginApi } from '@arkadia/plugin-types';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import { getCurrentTeam } from '../mod_team/team_state';

const TAG = 'autoCover';
const REACTION_MIN_MS = 850;
const REACTION_MAX_MS = 3400;
const MANEUVER_MS = 5000;
const FAILURE_WINDOW_MS = 15000;
// GMCP uses 0..6, while the displayed condition uses 1..7.
const MIN_HP = 3; // ranny (4/7)
const MANEUVER_COMMAND = /^(?:zaslon(?:\s|$)|przelam\s+obrone(?:\s|$)|(?:gz)?wycofaj\s+sie(?:\s|$)|\/(?:za[234]?|zas|prze|w)(?:\s|$))/i;

const normalizeName = (name: string) => name.replace(/[\[\]]/g, '').trim().toLowerCase();
const validHp = (hp: unknown): hp is number =>
  typeof hp === 'number' && Number.isInteger(hp) && hp >= 0 && hp <= 6;

type CoverDecision = { target: LocationObject; reason: string; count: number };

/** Preview one cover decision at a time without sending game commands. */
export function setupAutoCover(api: PluginApi): () => void {
  let enabled = false;
  const isEnabled = () => enabled;
  const reactionDelay = () => REACTION_MIN_MS +
    Math.floor(Math.random() * (REACTION_MAX_MS - REACTION_MIN_MS + 1));
  let reactionTimer: ReturnType<typeof setTimeout> | null = null;
  let cooldownTimer: ReturnType<typeof setTimeout> | null = null;
  let maneuverUntil = 0;
  const failures = new Map<number, number[]>();

  const cancelReaction = () => {
    if (reactionTimer !== null) clearTimeout(reactionTimer);
    reactionTimer = null;
  };

  const cancelCooldownWake = () => {
    if (cooldownTimer !== null) clearTimeout(cooldownTimer);
    cooldownTimer = null;
  };

  // Turning automatic cover off or moving clears decisions, not the game's cooldown.
  const reset = () => {
    cancelReaction();
    cancelCooldownWake();
    failures.clear();
  };

  const recentFailures = (id: number): number[] => {
    const recent = (failures.get(id) ?? []).filter(time => Date.now() - time <= FAILURE_WINDOW_MS);
    if (recent.length) failures.set(id, recent);
    else failures.delete(id);
    return recent;
  };

  const chooseTarget = (): CoverDecision | undefined => {
    if (api.team.getMembers().length === 0) return;
    const hp: unknown = api.gmcp.get()?.char?.state?.hp;
    if (!validHp(hp) || hp < MIN_HP) return;
    const objects = api.objects.getObjectsOnLocation();
    const me = objects.find(object => object.__category === 'player');
    if (!me) return;
    const team = objects.filter(object => object.__category === 'team' && object.num !== me.num);
    const teamIds = new Set(team.map(object => object.num));
    for (const id of failures.keys()) {
      if (!teamIds.has(id)) failures.delete(id);
    }

    const attackers = new Map<number, number>();
    for (const object of objects) {
      if (object.__category !== 'rest' || typeof object.attack_num !== 'number') continue;
      attackers.set(object.attack_num, (attackers.get(object.attack_num) ?? 0) + 1);
    }
    const mine = attackers.get(me.num) ?? 0;
    const candidates = team.flatMap(target => {
      const count = attackers.get(target.num) ?? 0;
      if (count === 0) return [];
      const failureCount = recentFailures(target.num).length;
      const priority = target.defense_target === true ? 3
        : failureCount >= 3 ? 2
        : validHp(target.hp) && Math.abs(hp - target.hp) <= 1 && count - mine >= 3 ? 1
        : 0;
      const reason = priority === 3 ? 'wskazany cel obrony'
        : priority === 2 ? '3 nieudane proby zasloniecia tego czlonka druzyny w 15 s'
        : `wyrownanie liczby atakujacych: cel ${count}, ty ${mine}; podobny stan zdrowia`;
      return priority ? [{ target, priority, count, reason }] : [];
    });
    // Stable tie-breaks: most attackers, then weakest condition, then object ID.
    candidates.sort((a, b) => b.priority - a.priority || b.count - a.count ||
      (a.target.hp ?? 7) - (b.target.hp ?? 7) || a.target.num - b.target.num);
    return candidates[0];
  };

  const request = () => {
    if (!isEnabled()) return;
    if (!chooseTarget()) {
      cancelReaction();
      cancelCooldownWake();
      return;
    }
    if (Date.now() < maneuverUntil) {
      cancelReaction();
      if (cooldownTimer === null) {
        cooldownTimer = setTimeout(() => {
          cooldownTimer = null;
          request();
        }, maneuverUntil - Date.now());
      }
      return;
    }
    cancelCooldownWake();
    if (reactionTimer !== null) return;
    reactionTimer = setTimeout(() => {
      reactionTimer = null;
      if (!isEnabled()) return;
      if (Date.now() < maneuverUntil) {
        request();
        return;
      }
      // Re-read HP, attackers, team and defense mark after the reaction delay.
      const decision = chooseTarget();
      if (!decision) return;
      failures.delete(decision.target.num); // one preview per set of failures
      reserveManeuver(Date.now() + MANEUVER_MS);
      api.output.print(`Potencjalnie wyslana komenda: zaslon ob_${decision.target.num}`);
      api.output.print(`Powod: ${decision.reason}`);
    }, reactionDelay());
  };

  const reserveManeuver = (until: number) => {
    maneuverUntil = Math.max(maneuverUntil, until);
    cancelReaction();
    request();
  };

  const onManeuver = () => reserveManeuver(Date.now() + MANEUVER_MS);
  const onCoverTimer = (seconds: number | null) => {
    if (seconds !== null && Number.isFinite(seconds) && seconds > 0) {
      reserveManeuver(Date.now() + Math.ceil(seconds * 1000));
    } else {
      // A late/null tick must never erase a newer locally reserved attempt.
      request();
    }
  };
  const onDisconnect = () => {
    enabled = false;
    reset();
    maneuverUntil = 0;
  };
  const onTeamChange = () => {
    reset();
    request();
  };

  // Match only known current teammates, using the same declensions as banners.
  const resolveTeammate = (form: string, grammaticalCase: 'M' | 'B'): LocationObject | undefined => {
    const name = normalizeName(form);
    const forms = getCurrentTeam().filter(member => normalizeName(member[grammaticalCase]) === name);
    const names = new Set([name, ...forms.map(member => normalizeName(member.M))]);
    const matches = api.objects.getObjectsOnLocation().filter(object =>
      object.__category === 'team' && object.desc && names.has(normalizeName(object.desc)),
    );
    return matches.length === 1 ? matches[0] : undefined;
  };

  registerTokenGate(api, 'zaslonic',
    /^[ >]*(.+?) probuje zaslonic (.+?) przed ciosami .+?, jednak nie jest w stanie tego uczynic\.$/,
    (line, matches) => {
      if (!isEnabled() || api.team.getMembers().length === 0) return line;
      const shielder = resolveTeammate(matches[1], 'M');
      const target = resolveTeammate(matches[2], 'B');
      if (shielder && target && shielder.num !== target.num) {
        failures.set(target.num, [...recentFailures(target.num), Date.now()].slice(-3));
        request();
      }
      return line;
    }, TAG);

  registerTokenGate(api, ['zaslania', 'zaslaniasz'], [
    /^[ >]*(?:Zrecznie zaslaniasz|Na rozkaz .+? zaslaniasz) (.+?) przed ciosami .+\.$/,
    /^[ >]*.+? (?:zrecznie )?zaslania (.+?) przed ciosami .+\.$/,
  ], (line, matches) => {
    if (!isEnabled() || api.team.getMembers().length === 0) return line;
    const target = resolveTeammate(matches[1], 'B');
    if (target) {
      failures.delete(target.num);
      request();
    }
    return line;
  }, TAG);

  registerTokenGate(api, ['wskazuje', 'wskazujesz'],
    /^[ >]*(?:.+? wskazuje|Wskazujesz) .+? jako cel obrony\.$/,
    line => { request(); return line; }, TAG);

  // Reserve at command time too: a manual maneuver wins even before its reply.
  // Expanded aliases go through the hook as well; reservation is idempotent.
  const hookId = api.commandHooks.register((command: string) => {
    if (MANEUVER_COMMAND.test(command.trim())) onManeuver();
    return undefined;
  });
  const plusId = api.aliases.register(/^zas\+$/i, () => {
    enabled = true;
    api.output.print('--> zas');
    request();
    return true;
  });
  const minusId = api.aliases.register(/^zas-$/i, () => {
    enabled = false;
    reset();
    api.output.print('--> juz nie zas');
    return true;
  });
  api.events.on('gmcp.objects.data', request);
  api.events.on('gmcp.objects.nums', request);
  api.events.on('gmcp.char.state', request);
  api.events.on('teamChange', onTeamChange);
  api.events.on('coverTimer', onCoverTimer);
  api.events.on('maneuverAttempted', onManeuver);
  api.events.on('mapMove', reset);
  api.events.on('client.disconnect', onDisconnect);

  return () => {
    enabled = false;
    reset();
    api.triggers.removeByTag(TAG);
    api.aliases.remove(plusId);
    api.aliases.remove(minusId);
    api.commandHooks.unregister(hookId);
    api.events.off('gmcp.objects.data', request);
    api.events.off('gmcp.objects.nums', request);
    api.events.off('gmcp.char.state', request);
    api.events.off('teamChange', onTeamChange);
    api.events.off('coverTimer', onCoverTimer);
    api.events.off('maneuverAttempted', onManeuver);
    api.events.off('mapMove', reset);
    api.events.off('client.disconnect', onDisconnect);
  };
}
