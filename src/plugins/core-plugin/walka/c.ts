import type { PluginApi } from '@arkadia/plugin-types';
import { ensureWeaponDrawn, type DobywanieState } from '../dobywanie/dobywanie_aliases';

/**
 * The `c` / `cc` killing aliases — the most-used combat commands. Migrated from
 * the CMUD `c` (solo / leader / follower) and `cc` aliases.
 *
 *   c           solo / leader: attack the configured main target (`zabij @CEL`)
 *               follower:      `zabij cel ataku` — the leader-marked target
 *   c <number>  attack the enemy <number> positions after the player in the
 *               room's object list (`ob_<num>`)
 *   c1..c4      attack configured target slot 1..4 (same as z1..z4) — all modes
 *   c <text>    manual kill: `zabij <text>` (e.g. `c kota` → `zabij kota`)
 *
 *   cc ...      same target resolution as `c`, but ALWAYS points and orders the
 *               whole team at the target (`wskaz <t> jako cel ataku` +
 *               `rozkaz druzynie zaatakowac <t>`).
 *
 * Every form first draws the weapon if it isn't in hands (CMUD
 * `#IF (@gdzie_bron=0) {dob}`). As LEADER, `c` also `wskaz`-es the target so the
 * team focuses the same enemy. (The CMUD `@scr` / `scrozkaz` variant and the
 * `@a_zabij` custom attack prefix are intentionally not migrated.)
 */
export function setupKillAlias(api: PluginApi, targets: string[], weaponState: DobywanieState): void {
  // Resolve the enemy `offset` positions after the player in the room object
  // list to a server object reference ("ob_<num>"), or null if out of range.
  const locationTarget = (offset: number): string | null => {
    const objects = api.objects.getObjectsOnLocation();
    const myNum = api.team.getPlayerNum();
    const myIdx = myNum != null ? objects.findIndex((o) => o.num === myNum) : -1;
    if (myIdx < 0) return null;
    const target = objects[myIdx + offset];
    return target ? `ob_${target.num}` : null;
  };

  // zabij <target>, plus optional team follow-ups on the same target.
  const strike = (target: string, opts: { wskaz?: boolean; rozkaz?: boolean }) => {
    api.command.send(`zabij ${target}`);
    if (opts.wskaz) api.command.send(`wskaz ${target} jako cel ataku`);
    if (opts.rozkaz) api.command.send(`rozkaz druzynie zaatakowac ${target}`);
  };

  // Resolve a `c`/`cc` argument to a target, then strike. `bareTarget` is used
  // for the no-arg form (configured slot 1, or "cel ataku" for a follower).
  const kill = (arg: string, bareTarget: string, opts: { wskaz?: boolean; rozkaz?: boolean }) => {
    let target: string | null;
    if (arg === '') target = bareTarget;
    else if (/^\d+$/.test(arg)) target = locationTarget(parseInt(arg, 10));
    else target = arg.toLowerCase();
    if (target != null) strike(target, opts);
  };

  // --- c — role-aware ---------------------------------------------------------
  const cHandler = (arg: string) => {
    ensureWeaponDrawn(api, weaponState);
    const mode = getMode(api);
    if (mode === 'follower') {
      kill(arg, 'cel ataku', {}); // follow the leader's target, no team orders
    } else {
      kill(arg, targets[0], { wskaz: mode === 'leader' });
    }
  };
  api.aliases.register(/^c$/, () => {
    cHandler('');
    return true;
  });
  api.aliases.register(/^c\s+(.+)$/, (matches) => {
    cHandler(matches?.[1]?.trim() ?? '');
    return true;
  });

  // c1 / c2 / c3 / c4 — attack configured target slot 1..4 (as z1..z4 do).
  for (let i = 0; i < 4; i++) {
    const n = i + 1;
    api.aliases.register(new RegExp(`^c${n}$`), () => {
      ensureWeaponDrawn(api, weaponState);
      api.command.send(`zabij ${targets[n - 1]}`);
      return true;
    });
  }

  // --- cc — always command the whole team -------------------------------------
  const ccHandler = (arg: string) => {
    ensureWeaponDrawn(api, weaponState);
    kill(arg, targets[0], { wskaz: true, rozkaz: true });
  };
  api.aliases.register(/^cc$/, () => {
    ccHandler('');
    return true;
  });
  api.aliases.register(/^cc\s+(.+)$/, (matches) => {
    ccHandler(matches?.[1]?.trim() ?? '');
    return true;
  });
}

type Mode = 'solo' | 'leader' | 'follower';

/** Current team role. `getMembers()` includes the player, so >1 means a team. */
function getMode(api: PluginApi): Mode {
  const members = api.team.getMembers() ?? [];
  if (members.length <= 1) return 'solo';
  const leaderId = api.team.getLeaderId();
  const myNum = api.team.getPlayerNum();
  if (leaderId == null || myNum == null) return 'solo';
  return leaderId === myNum ? 'leader' : 'follower';
}
