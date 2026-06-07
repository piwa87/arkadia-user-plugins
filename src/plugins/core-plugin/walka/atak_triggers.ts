import type { PluginApi } from '@arkadia/plugin-types';
import { requestPermission, notify } from '../../../lib/notifications';
import { getHpLabel, type KondycjeState } from '../kondycje/kondycje_triggers';

const ATAK_PATTERNS = [
  /^(.*) atakuje cie!$/, // atakujecie
  /^(.*) rzuca sie do ataku na ciebie!$/, // atakujecie_rzuca
  /^(.*) z imieniem Morra na ustach rzuca sie do walki z toba!$/, // atak_mnie_morr
  /^(.*) (?:ostroznie obchodzi cie|wykrzykujac glosno|od niechcenia, wyraznie cie lekcewazac).* (?:, atakujac cie|rzuca sie na ciebie)!$/, // atak_ks
  /^(.*) (?:wykrzykujac glosno|glosno krzyczac).*rzuca sie na ciebie!$/, // atak_mc
  /^(.*) zaciska uchwyt na swej broni i rozpoczyna z toba walke!$/, // atak_kg
  /^Oczy (.*) zachodza woalem rytualnego transu, gdy jak blyskawica rzuca sie on na ciebie, rozniecajac burze Tanca Smierci!$/, // tw_org
  /^Wpadasz w panike!$/, // panika_1os
  /^Udalo ci sie gdzies uciec!$/, // panika_ucieczka
];

export function setupAtakiTriggers(api: PluginApi, kondycjeState: KondycjeState): void {
  const tag = 'atakiTriggers';

  // Request browser notification permission once on load
  requestPermission();

  api.triggers.register(
    ATAK_PATTERNS,
    (line) => {
      api.command.send('play_ding');
      return line;
    },
    tag,
  );

  // Kill confirmation — event-driven, fires for any enemy death
  api.events.on('enemyKilled', () => {
    api.command.send('next!');
    api.command.send('play_morse');
  });

  // All enemies dead — browser notification with current HP condition
  api.events.on('allEnemiesKilled', () => {
    notify(`Wsszystko \u{1F480} [${getHpLabel(kondycjeState.hp)}]`);
  });

  // Test alias — manually fire allEnemiesKilled
  api.aliases.register(/^ake$/, () => {
    api.events.emit('allEnemiesKilled');
    return true;
  });
}
