import type { PluginApi } from '@arkadia/plugin-types';

const ZASLON_PATTERNS = [
  /^(.*) z wprawa staje pomiedzy (.*) a (.*), przyjmujac na siebie nadchodzace ciosy\./,  // zasstraznik_przed_team
  /^(.*) z wprawa staje pomiedzy toba a (.*), przyjmujac na siebie twoje nadchodzace ciosy\./, // zasstraznik_przed_ja
  /^(.*) szybko przesuwa sie za (.*), uciekajac przed twoimi ciosami\./,                   // wycofka_przede_mna
  /^(.*) szybko przesuwa sie za (.*), kryjac sie przed atakami /,                          // wycofka_przed_team
  /^(.*) zrecznie zaslania (.*) przed twoimi ciosami\./,                                   // zas_przed_ja
  /^(.*) zrecznie zaslania (.*) przed ciosami /,                                           // zas_przed_team
  /^(.*) krotkim skinieniem dloni przyzywa (.*), kryjac sie za nia przed twoimi ciosami\./, // blav_przed_ja
  /^(.*) krotkim skinieniem dloni przyzywa .*, kryjac sie .* przed ciosami /,              // blaviken_wycofka
];

export function setupZaslonTriggers(api: PluginApi): void {
  const tag = 'zaslonTriggers';

  api.triggers.register(
    ZASLON_PATTERNS,
    (line) => {
      api.command.send('play_morse');
      return line;
    },
    tag,
  );
}
