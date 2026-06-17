import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { getMyColor } from '../../../lib/colors/my-colors';

const ZASLON_PATTERNS = [
  /^(.*) z wprawa staje pomiedzy toba a (.*), przyjmujac na siebie twoje nadchodzace ciosy\./, // zasstraznik_przed_ja
  /^(.*) szybko przesuwa sie za (.*), uciekajac przed twoimi ciosami\./, // wycofka_przede_mna
  /^(.*) krotkim skinieniem dloni przyzywa (.*), kryjac sie za nia przed twoimi ciosami\./, // blav_przed_ja
  /^(.*) krotkim skinieniem dloni przyzywa .*, kryjac sie .* przed ciosami /, // blaviken_wycofka
];

export function setupZaslonTriggers(api: PluginApi): void {
  const tag = 'zaslonTriggers';
  const c41 = getAnsiFormatState(41, api);
  const c35 = getAnsiFormatState(35, api);
  const c38 = getAnsiFormatState(38, api);
  const c0 = getMyColor(0, api);

  api.triggers.register(
    ZASLON_PATTERNS,
    (line) => {
      api.command.send('play_morse');
      return line;
    },
    tag,
  );

  // zaslona przed moimi ciosami
  api.triggers.register(
    /^(.*) zrecznie zaslania (.*) przed twoimi ciosami\./,
    (line, matches) => {
      const p1 = '      PRZED TOBA              ';
      const p2 = `     ${matches[1]}     `;
      const p3 = ' z a s l a n i a ';
      const p4 = `     ${matches[2]}`;
      const newText = p1 + p2 + p3 + p4;
      const o2 = p1.length;
      const o3 = o2 + p2.length;
      const o4 = o3 + p3.length;
      line.replace([0, line.text.length], newText);
      line.color([0, o2], c41);
      line.color([o2, o3], c0);
      line.color([o3, o4], c35);
      line.color([o4, newText.length], c0);
      api.command.send('play_morse');
      return line;
    },
    tag,
  );

  // moja udana zaslona
  api.triggers.register(
    /^Zrecznie zaslaniasz (.*) przed ciosami (.*)\./,
    (line, matches) => {
      const label = '     z a s l a n i a s z      ';
      const rest = `     ${matches[1]}     przed     ${matches[2]}`;
      const newText = label + rest;
      line.replace([0, line.text.length], newText);
      line.color([0, label.length], c35);
      line.color([label.length, newText.length], c0);
      return line;
    },
    tag,
  );

  // moja nieudana zasłona
  api.triggers.register(
    /^Probujesz zaslonic (.*) przed ciosami (.*), jednak nie jestes w stanie tego uczynic\./,
    (line, matches) => {
      const label = '     n i e   z a s l a n i a s z     ';
      const rest = `     ${matches[1]}     przed     ${matches[2]}`;
      const newText = label + rest;
      line.replace([0, line.text.length], newText);
      line.color([0, label.length], c38);
      line.color([label.length, newText.length], c0);
      return line;
    },
    tag,
  );
}
