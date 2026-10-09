import type { PluginApi } from '@arkadia/plugin-types';
import { ensureWeaponDrawn, type DobywanieState } from '../dobywanie/state';

/**
 * Attack aliases. Each attempts to draw the selected weapon before attacking.
 *
 *   c           solo / leader: attack the configured main target (`zabij @CEL`)
 *               follower:      `/z` — let the client validate the attack target
 *   c <text>    manual kill: `zabij <text>` (e.g. `c kota` → `zabij kota`)
 *   c<n>        delegate to the client's `/z <n>` enemy numbering
 *   cc          attack the configured main target, including as a follower
 *
 * Leaders also mark the target for `c` / `c <text>` / `cc`; `cc` additionally
 * orders the team to attack. Team behaviour for `c<n>` is handled by the client.
 * Unlike `c<n>`, `z1`..`z4` in walka_aliasy.ts use the `set` target slots.
 */
export function setupKillAlias(api: PluginApi, targets: string[], weaponState: DobywanieState): void {
  const strike = (target: string, opts: { wskaz?: boolean }) => {
    api.command.send(`zabij ${target}`);
    if (opts.wskaz) api.command.send(`wskaz ${target} jako cel ataku`);
  };

  const kill = (arg: string, bareTarget: string, opts: { wskaz?: boolean }) => {
    const target = arg === '' ? bareTarget : arg.toLowerCase();
    strike(target, opts);
  };

  const cHandler = (arg: string) => {
    ensureWeaponDrawn(api, weaponState);
    const mode = getMode(api);
    if (mode === 'follower' && arg === '') {
      api.command.send('/z');
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

  api.aliases.register(/^c(\d+)$/, (matches) => {
    ensureWeaponDrawn(api, weaponState);
    api.command.send(`/z ${matches?.[1]}`);
    return true;
  });

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

/** Resolve the team role, falling back to solo when team IDs are unavailable. */
export function getMode(api: PluginApi): Mode {
  const members = api.team.getMembers() ?? [];
  if (members.length <= 1) return 'solo';
  const leaderId = api.team.getLeaderId();
  const myNum = api.team.getPlayerNum();
  if (leaderId == null || myNum == null) return 'solo';
  return leaderId === myNum ? 'leader' : 'follower';
}
