import type { PluginApi } from '@arkadia/plugin-types';
import { getCurrentTeam } from './team_state';

let prprAliasId: string | undefined;

export function setupTeamCommandAliases(api: PluginApi): void {
  // ws - support/buff ally
  api.aliases.register(/^ws$/, () => {
    api.command.send('wesprzyj');
    return true;
  });

  // pd - leave team
  api.aliases.register(/^pd$/, () => {
    api.command.send('porzuc druzyne');
    api.command.send('druzyna');
    return true;
  });

  // obd - inspect team
  api.aliases.register(/^obd$/, () => {
    api.command.send('ob druzyne');
    return true;
  });

  // prpr <n|name> - use /pro for a team slot, the native command for a name
  prprAliasId = api.aliases.register(/^prpr\s+(.+)$/i, (matches) => {
    const arg = matches?.[1]?.trim() ?? '';
    if (!arg) return true;

    const slot = Number(arg);
    const team = getCurrentTeam();
    if (Number.isInteger(slot)) {
      const target = slot >= 1 && slot <= team.length ? team[slot - 1].C : arg;
      api.command.send(`/pro ${target.toLowerCase()}`);
    } else {
      api.command.send(`przekaz prowadzenie ${arg.toLowerCase()}`);
    }
    api.command.send('druzyna');
    return true;
  });
}

export function destroyTeamCommandAliases(api: PluginApi): void {
  if (prprAliasId) {
    api.aliases.remove(prprAliasId);
    prprAliasId = undefined;
  }
}
