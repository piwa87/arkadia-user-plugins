import type { PluginApi } from '@arkadia/plugin-types';

/**
 * keys - display key reference list
 */
export function setupKeysAlias(api: PluginApi): void {
  api.aliases.register(/^keys$/, () => {
    const keys = [
      '* Dlugi skomplikowany klucz ---------------- Wieza Zywiolakow',
      '* Duzy ciezki klucz ----------------------------------- Seth',
      '* Duzy pordzewialy klucz --------------- Nieznane w Imperium',
      '* Duzy stalowy klucz ------------- Kultysci Rogatego Szczura',
      '* Gruby ciezki klucz ----------------------- Kurhany w Lyrii',
      '* Jadeitowa pieczec --------------------------- Fort w Lyrii',
      '* Lsniacy zelazny klucz ----------------- Nekromanta w Tilei',
      '* Nieduzy klucz z herbem ------------------- Blekitnokrwisci',
      '* Mosiezny krasnoludzki klucz ze zdobieniami -- Twierdza GKS',
      '* Niewielka dziesiecioramienna gwiazda z mosiadzu ---- Mumia',
      '* Niewielka zamoczona karteczka ----------- Igorowe Jaskinie',
      '* Podluzny srebrny kluczyk ----------------------- Wezendorf',
      '* Pordzewialy archaiczny klucz ------------  Ruiny pod Rinde',
      '* Stalowy zardzewialy klucz --------------------- Utopce Imp',
      '* Starozytny elfi pergamin ----------- Cmentarz w Brokilonie',
      '* Wielki stylizowany klucz ---------------------- Czarnotrup',
      '* Wielobarwny orczy fetysz ------------------ Trolle Opalowe',
      '* Zardzewialy duzy klucz ---------------- Kanaly w Quenelles',
      '* Zelazny ciezki klucz ---------------- Fort w Gorach Sinych',
      '* Zloty klucz --------------- Krypta na bagnach w Brokilonie',
    ];
    for (const line of keys) {
      api.output.print(line);
    }
    return true;
  });
}
