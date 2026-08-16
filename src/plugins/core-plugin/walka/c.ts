import type { PluginApi } from '@arkadia/plugin-types';
import { ensureWeaponDrawn, type DobywanieState } from '../dobywanie/state';

/**
 * The `c` killing aliases — the most-used combat commands. Migrated from the
 * CMUD `c` (solo / leader / follower) alias.
 *
 *   c           solo / leader: attack the configured main target (`zabij @CEL`)
 *               follower:      `zabij cel ataku` — the leader-marked target
 *   c <text>    manual kill: `zabij <text>` (e.g. `c kota` → `zabij kota`)
 *   c<n>        attack enemy <n> from the client's own numbering, via the
 *               built-in `/z <n>` command (`c1`, `c2`, … `c12`)
 *
 * Note the split: `c<n>` uses the CLIENT's enemy numbering, while `z1`..`z4`
 * (walka_aliasy.ts) use the `set`-configured target slots. Keep them apart.
 *
 * Every form first draws the weapon if it isn't in hands (CMUD
 * `#IF (@gdzie_bron=0) {dob}`). As LEADER, `c` also `wskaz`-es the target so the
 * team focuses the same enemy. (The CMUD `@scr` / `scrozkaz` variant and the
 * `@a_zabij` custom attack prefix are intentionally not migrated.)
 */
export function setupKillAlias(api: PluginApi, targets: string[], weaponState: DobywanieState): void {
  // zabij <target>, plus an optional team follow-up on the same target.
  const strike = (target: string, opts: { wskaz?: boolean }) => {
    api.command.send(`zabij ${target}`);
    if (opts.wskaz) api.command.send(`wskaz ${target} jako cel ataku`);
  };

  // Resolve a `c` argument to a target, then strike. `bareTarget` is used for
  // the no-arg form (configured slot 1, or "cel ataku" for a follower).
  const kill = (arg: string, bareTarget: string, opts: { wskaz?: boolean }) => {
    const target = arg === '' ? bareTarget : arg.toLowerCase();
    strike(target, opts);
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

  // c<n> — attack enemy <n> from the client's own numbering (built-in `/z`).
  // NOT the `set` slots: those live on z1..z4 in walka_aliasy.ts.
  api.aliases.register(/^c(\d+)$/, (matches) => {
    ensureWeaponDrawn(api, weaponState);
    api.command.send(`/z ${matches?.[1]}`);
    return true;
  });

  // cc — same as c but adds 'rozkaz druzynie zaatakowac' for leader.
  // NOTE: unlike `c`, `cc` always attacks the user's own target (targets[0]),
  // NOT the leader's marked target. The follower XML says `zabij @CEL`.
  api.aliases.register(/^cc$/, () => {
    ensureWeaponDrawn(api, weaponState);
    const mode = getMode(api);
    api.command.send(`zabij ${targets[0]}`);
    if (mode === 'leader') {
      api.command.send(`wskaz ${targets[0]} jako cel ataku`);
      api.command.send(`rozkaz druzynie zaatakowac ${targets[0]}`);
    }
    return true;
  });
}

type Mode = 'solo' | 'leader' | 'follower';

/** Current team role. `getMembers()` includes the player, so >1 means a team. */
export function getMode(api: PluginApi): Mode {
  const members = api.team.getMembers() ?? [];
  if (members.length <= 1) return 'solo';
  const leaderId = api.team.getLeaderId();
  const myNum = api.team.getPlayerNum();
  if (leaderId == null || myNum == null) return 'solo';
  return leaderId === myNum ? 'leader' : 'follower';
}
