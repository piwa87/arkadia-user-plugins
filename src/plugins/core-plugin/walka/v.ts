import type { PluginApi } from '@arkadia/plugin-types';
import { getWrogZlamany, clearWrogZlamany } from '../mod_team/team_lamanie';
import { getMode } from './c';

/**
 * Break-related aliases (migrated from CMUD `aliasy_walki_solo` and
 * `aliasy_walki_druzyna`).
 *
 * The behaviour depends on team role:
 *
 *   Solo/Leader           | Follower
 *   ----------------------|----------------------------------
 *   v: break only         | v: break + c (attack the leader's target)
 *   vv: break+team        | vv: team+break+c
 *   vc: break+kill        | vc: kondycja+v+c+separator
 *   cv: kill wrog_zlamany | cv: same
 *
 * Every form sends plain game commands directly — the team_lamanie.ts module
 * handles banners/sounds/auto-attack when the break lands.
 */

// ---- Shared helpers -----------------------------------------------------------

/** Drop shield/cover when attacking a previously broken enemy. */
function dropCover(api: PluginApi): void {
  api.command.send('przestan kryc sie za zaslona');
}

/** Use the client's built-in break alias for the current or selected target. */
function breakDefense(api: PluginApi, target?: string): void {
  api.command.send(target ? `/prze ${target}` : '/prze');
}

export function setupPrzelamAliases(api: PluginApi): void {
  // cv — zabij wrog_zlamany + kondycja (same for all modes)
  api.aliases.register(/^cv$/, () => {
    const wrog = getWrogZlamany();
    if (!wrog) return true;
    api.command.send(`zabij ${wrog}`);
    api.command.send(`wskaz ${wrog} jako cel ataku`);
    api.command.send(`rozkaz druzynie zaatakowac ${wrog}`);
    api.command.send('kondycja wszystkich');
    return true;
  });

  // v — przelam obrone
  //   v1, v2, ... — przelam obrone obiektu o numerze 1, 2, ...
  //   Follower: after breaking, also c (attack the leader's marked target)
  api.aliases.register(/^v(\d+)?$/, (matches) => {
    const wrog = getWrogZlamany();
    const arg = matches?.[1];
    const mode = getMode(api);

    // No arg + wrog_zlamany set → attack him (like cv but clears the flag)
    if (!arg && wrog) {
      dropCover(api);
      api.command.send(`zabij ${wrog}`);
      api.command.send(`wskaz ${wrog} jako cel ataku`);
      api.command.send(`rozkaz druzynie zaatakowac ${wrog}`);
      clearWrogZlamany();
      return true;
    }

    // No arg, no wrog_zlamany → break
    if (!arg) {
      breakDefense(api);
      if (mode === 'follower') {
        api.command.send('c'); // follower follows up by attacking the leader's target
      }
      return true;
    }

    // Numbered target
    breakDefense(api, arg);
    return true;
  });

  // vv — solo/leader: break + team attack
  //      follower:    team attack FIRST + break + c
  api.aliases.register(/^vv(?:\s+(.+))?$/, (matches) => {
    const arg = matches?.[1]?.trim();
    const mode = getMode(api);

    if (mode === 'follower') {
      // Follower XML: team attack FIRST, then break, then c
      if (!arg) {
        api.command.send('rozkaz druzynie zaatakowac cel ataku');
      } else {
        api.command.send(`rozkaz druzynie zaatakowac ${arg.toLowerCase()}`);
      }
      if (!arg) {
        breakDefense(api);
        api.command.send('c');
      } else {
        breakDefense(api, arg);
        api.command.send(`c ${arg.toLowerCase()}`);
      }
      return true;
    }

    // Solo/leader
    if (!arg) {
      breakDefense(api);
      api.command.send('rozkaz druzynie zaatakowac cel ataku');
    } else {
      breakDefense(api, arg);
      api.command.send(`rozkaz druzynie zaatakowac ${arg.toLowerCase()}`);
    }
    return true;
  });

  // vc — solo/leader: break + kill + kondycja
  //      follower:    kondycja FIRST + v + c + separator
  api.aliases.register(/^vc$/, () => {
    const mode = getMode(api);

    if (mode === 'follower') {
      // Follower XML: kondycja, then v (which breaks + c), then separator
      api.command.send('kondycja wszystkich');
      api.command.send('v');
      api.command.send('c');
      // Separator: a line of dashes (CMUD #SAY)
      const buf = new api.AnsiAwareBuffer();
      buf.append('     '.repeat(26));
      api.output.print(buf);
      return true;
    }

    // Solo/leader
    breakDefense(api);
    api.command.send('zabij cel ataku');
    api.command.send('kondycja wszystkich');
    return true;
  });
}
