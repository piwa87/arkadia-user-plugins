import type { PluginApi } from '@arkadia/plugin-types';

export function setupCombatAliases(
  api: PluginApi,
  targets: string[],
  ORDINALS: string[],
  updateFooter: () => void,
): void {
  // #region c [target]
  api.aliases.register(/^c(?:\s+(.+))?$/, (matches) => {
    const arg = matches?.[1]?.trim();
    api.command.send(`zabij ${arg ?? targets[0]}`);
    return true;
  });

  // #region c1 / c2 / c3 / c4
  for (let i = 0; i < 4; i++) {
    const n = i + 1;
    api.aliases.register(new RegExp(`^c${n}$`), () => {
      api.command.send(`c ${targets[i]}`);
      return true;
    });
  }

  // #region set [target]
  api.aliases.register(/^set(?:\s+(.+))?$/, (matches) => {
    const target = matches?.[1]?.trim();
    if (!target) {
      return true;
    }
    for (let i = 0; i < 4; i++) {
      targets[i] = `${ORDINALS[i]}${target}`;
    }
    updateFooter();
    return true;
  });

  // #region set1 / set2 / set3 / set4
  for (let i = 0; i < 4; i++) {
    const n = i + 1;
    api.aliases.register(new RegExp(`^set${n}(?:\\s+(.+))?$`), (matches) => {
      const what = matches?.[1]?.trim();
      if (!what) {
        return true;
      }
      targets[i] = what;
      updateFooter();
      return true;
    });
  }

  // #region kill [target]
  api.aliases.register(/^kill(?:\s+(.+))?$/, (matches) => {
    const target = matches?.[1]?.trim();
    if (!target) {
      return true;
    }
    api.command.send(`zabij ${target}`);
    api.command.send('play_glass');
    return true;
  });
}
