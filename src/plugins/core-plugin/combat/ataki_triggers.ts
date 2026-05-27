import type { PluginApi } from '@arkadia/plugin-types';

const ATAK_PATTERNS = [
  /^(.*) atakuje cie!$/,                          // atakujecie
  /^(.*) rzuca sie do ataku na ciebie!$/,          // atakujecie_rzuca
  /^(.*) z imieniem Morra na ustach rzuca sie do walki z toba!$/, // atak_mnie_morr
  /^(.*) (?:ostroznie obchodzi cie|wykrzykujac glosno|od niechcenia, wyraznie cie lekcewazac).* (?:, atakujac cie|rzuca sie na ciebie)!$/, // atak_ks
  /^(.*) (?:wykrzykujac glosno|glosno krzyczac).*rzuca sie na ciebie!$/, // atak_mc
  /^(.*) zaciska uchwyt na swej broni i rozpoczyna z toba walke!$/, // atak_kg
  /^Oczy (.*) zachodza woalem rytualnego transu, gdy jak blyskawica rzuca sie on na ciebie, rozniecajac burze Tanca Smierci!$/, // tw_org
  /^Wpadasz w panike!$/,                           // panika_1os
  /^Udalo ci sie gdzies uciec!$/,                  // panika_ucieczka
];

export function setupAtakiTriggers(api: PluginApi): void {
  const tag = 'atakiTriggers';

  api.triggers.register(
    ATAK_PATTERNS,
    (line) => {
      api.command.send('play_ding');
      return line;
    },
    tag,
  );
}
