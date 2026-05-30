import type { PluginApi } from '@arkadia/plugin-types';
import { storage } from '../../../lib/storage';

export function setupCombatAliases(
  api: PluginApi,
  targets: string[],
  ORDINALS: string[],
  updateFooter: () => void,
): void {
  // #region z [target or 1-4]
  api.aliases.register(/^z(?:\s+(.+))?$/, (matches) => {
    const arg = matches?.[1]?.trim();
    let target: string;
    if (!arg) {
      target = targets[0];
    } else {
      const n = parseInt(arg, 10);
      target = n >= 1 && n <= 4 && !isNaN(n) ? targets[n - 1] : arg;
    }
    api.command.send(`zabij ${target}`);
    return true;
  });

  // #region z1 / z2 / z3 / z4
  for (let i = 0; i < 4; i++) {
    const n = i + 1;
    api.aliases.register(new RegExp(`^z${n}$`), () => {
      api.command.send(`z ${n}`);
      return true;
    });
  }

  // #region c — attack set enemy #1
  api.aliases.register(/^c$/, () => {
    api.command.send(`zabij ${targets[0]}`);
    return true;
  });

  // #region c1 / c2 / c3 / c4 — delegate to z 1..4
  for (let i = 0; i < 99; i++) {
    const n = i + 1;
    api.aliases.register(new RegExp(`^c${n}$`), () => {
      api.command.send(`/z ${n}`);
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
    storage.set('targets', targets);
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
      storage.set('targets', targets);
      updateFooter();
      return true;
    });
  }

  // #region dp - attack all 4 targets in reverse priority order
  api.aliases.register(/^dp$/, () => {
    api.command.send(`zabij ${targets[3]}`);
    api.command.send(`zabij ${targets[2]}`);
    api.command.send(`zabij ${targets[1]}`);
    api.command.send(`zabij ${targets[0]}`);
    return true;
  });
}
