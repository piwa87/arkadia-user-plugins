import type { PluginApi } from '@arkadia/plugin-types';
import { requestPermission, notify } from '../../../lib/notifications';
import { getHpLabel, type KondycjeState } from '../kondycje/kondycje_triggers';

/**
 * All-enemies-dead browser notification. The attack-detection and `enemyKilled`
 * triggers were moved to development-plugin (mod_team/team_ataki); this stays in
 * core because the notification reports the player's HP condition, which is
 * tracked by core's kondycje state.
 */
export function setupAtakiTriggers(api: PluginApi, kondycjeState: KondycjeState): void {
  // Request browser notification permission once on load
  requestPermission();

  // All enemies dead — browser notification with current HP condition
  api.events.on('allEnemiesKilled', () => {
    notify(`Wszystko \u{1F480} [${getHpLabel(kondycjeState.hp)}]`);
  });

  // Test alias — manually fire allEnemiesKilled
  api.aliases.register(/^ake$/, () => {
    api.events.emit('allEnemiesKilled');
    return true;
  });
}
