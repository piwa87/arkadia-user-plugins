import type { PluginApi } from '@arkadia/plugin-types';
import { requestPermission, notify } from '../../../lib/notifications';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import { getHpLabel, type KondycjeState } from '../kondycje/kondycje_triggers';

const TAG = 'atakTriggers';

/**
 * All-enemies-dead browser notification. The attack-detection and `enemyKilled`
 * triggers live in mod_team/team_ataki; this stays here because the notification
 * reports the player's HP condition, tracked by core's kondycje state.
 */
export function setupAtakiTriggers(api: PluginApi, kondycjeState: KondycjeState): () => void {
  // Request browser notification permission once on load
  requestPermission();

  // All enemies dead — browser notification with current HP condition
  const onAllEnemiesKilled = () => {
    notify(`Wszystko \u{1F480} [${getHpLabel(kondycjeState.hp)}]`);
  };
  api.events.on('allEnemiesKilled', onAllEnemiesKilled);

  // Test alias — manually fire allEnemiesKilled
  api.aliases.register(/^ake$/, () => {
    api.events.emit('allEnemiesKilled');
    return true;
  });

  // Already fighting — confirm OK and cancel attack timer.
  const c35 = getAnsiFormatState(35, api);
  registerTokenGate(
    api,
    'walczysz',
    /^Juz walczysz z .*\.$/,
    (line) => {
      const msg = '       OK                     ';
      line.replace([0, line.text.length], msg, c35);
      return line;
    },
    TAG,
  );

  return () => api.events.off('allEnemiesKilled', onAllEnemiesKilled);
}
