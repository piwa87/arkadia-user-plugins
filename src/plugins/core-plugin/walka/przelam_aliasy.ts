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
 *   vv: drop+break+team   | vv: team+drop+break+c
 *   vc: drop+break+kill   | vc: kondycja+v+c+separator
 *   cv: kill wrog_zlamany | cv: same
 *
 * Every form sends plain game commands directly — the team_lamanie.ts module
 * handles banners/sounds/auto-attack when the break lands.
 */

// ---- Shared helpers -----------------------------------------------------------

/** Drop shield/cover. */
function dropCover(api: PluginApi): void {
  api.command.send('przestan kryc sie za zaslona');
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

  // v — drop cover + przelam obrone
  //   Follower: after breaking, also c (attack the leader's marked target)
  api.aliases.register(/^v(?:\s+(.+))?$/, (matches) => {
    const wrog = getWrogZlamany();
    const arg = matches?.[1]?.trim();
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

    // No arg, no wrog_zlamany → drop cover + break
    if (!arg) {
      dropCover(api);
      api.command.send('przelam obrone celu ataku');
      if (mode === 'follower') {
        api.command.send('c'); // follower follows up by attacking the leader's target
      }
      return true;
    }

    // Named target
    dropCover(api);
    api.command.send(`przelam obrone ${arg.toLowerCase()}`);
    return true;
  });

  // vv — solo/leader: drop cover + break + team attack
  //      follower:    team attack FIRST + drop cover + break + c
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
      dropCover(api);
      if (!arg) {
        api.command.send('przelam obrone celu ataku');
        api.command.send('c');
      } else {
        api.command.send(`przelam obrone ${arg.toLowerCase()}`);
        api.command.send(`c ${arg.toLowerCase()}`);
      }
      return true;
    }

    // Solo/leader
    dropCover(api);
    if (!arg) {
      api.command.send('przelam obrone celu ataku');
      api.command.send('rozkaz druzynie zaatakowac cel ataku');
    } else {
      api.command.send(`przelam obrone ${arg.toLowerCase()}`);
      api.command.send(`rozkaz druzynie zaatakowac ${arg.toLowerCase()}`);
    }
    return true;
  });

  // vc — solo/leader: drop cover + break + kill + kondycja
  //      follower:    kondycja FIRST + v + c + separator
  api.aliases.register(/^vc$/, () => {
    const mode = getMode(api);

    if (mode === 'follower') {
      // Follower XML: kondycja, then v (which drops cover + breaks + c), then separator
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
    dropCover(api);
    api.command.send('przelam obrone celu ataku');
    api.command.send('zabij cel ataku');
    api.command.send('kondycja wszystkich');
    return true;
  });
}