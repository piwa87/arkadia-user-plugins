import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';

const ACCUSATIVE: Record<string, string> = {
  krata: 'krate',
  klapa: 'klape',
  plyta: 'plyte',
  wlaz: 'wlaz',
};

export function setupBramyTriggers(api: PluginApi): void {
  const tag = 'bramy';

  const skyblue = api.colors.fromHex('#87ceeb');
  const firebrick = api.colors.fromHex('#b22222');
  const zamknieteColor = getAnsiFormatState(42, api);
  const otwarteColor = getAnsiFormatState(41, api);
  const cyanColor = getAnsiFormatState(6, api);
  const goldColor = getAnsiFormatState(3, api);

  // Open door/gate in room description (e.g. "Otwarte drzwi prowadza...")
  api.triggers.register(
    /^Otwart\w+.* (?:wrota|krata|furtka|drzwi|brama)/,
    (line) => line.color([0, line.text.length], skyblue),
    tag,
  );

  // Closed door/gate in room description (e.g. "Zamkniete wrota stoja...")
  api.triggers.register(
    /^Zamkniet\w+.* (?:drzwi|wrota|brama|furtka|krata)/,
    (line) => line.color([0, line.text.length], firebrick),
    tag,
  );

  // Gate/door closing event — prepend green-bg ZAMKNIETE label
  api.triggers.register(
    /^(?:.*zamyka sie bezszelestnie\.|.*zamyka ciezkie skrzydlo bramy.*\.|.*przesuwa sie, zamykajac wejscie do miasta\.|.*kamienny blok przesuwa sie, blokujac przejscie\.|.* zostaje ona zamknieta\.|.* zamykaja sie|.* zamyka sie\.|.* zamknel\w+ sie\.|.* powoli opada w dol\.|.* domyka jedno skrzydlo bramy\..*|.* krata opada, zamykajac przejscie\.|Wartownik zamyka drzwiczki w jednym skrzydle bramy\.)/,
    (line) => line.prepend('   ZAMKNIETE   ', zamknieteColor),
    tag,
  );

  // Gate/door opening event — prepend red-bg OTWARTE label + morse alert
  api.triggers.register(
    /^(?:Wrota lekko uchylaja sie\.|Pien powoli odsuwa sie, odslaniajac.*\.|Mozna teraz bezpiecznie przejsc na druga strone\.|.*wrota powoli otwieraja sie\.|.*wrota otwieraja sie ukazujac.*|.*skrzydlo bramy uchyla sie\.|.*otwierajac .* miasta\.|.*metaliczny zgrzyt i odrzwia uchylaja sie,.*\.|.*do gory otwierajac.*|.* zostaj\w+ otwart\w+\.|.* straznik otwiera brame\.|.* rozst\w+ sie na boki.*|.* plyty bramy przesuwaja.*|.* otworzyl\w+ sie\.|.* otwieraja wejscie do twierdzy\.|.* otwiera sie\.|.* otwiera jedno skrzydlo bramy\.|.* i trzaskow wrota powoli otwieraja sie\.|.* mocno otwierajac brame\.|Udaje ci sie uniesc .* krate, otwierajac przejscie\.|Szorujac po podlodze jeden z regalow przesuwa sie, otwierajac przejscie\.|Szorujac po kamiennej podlodze zachodnia sciana otwiera sie niczym skrzydla drzwi\.|Slychac metaliczny dzwiek zasuwy i drzwiczki w jednym skrzydle bramy otwieraja sie\.)/,
    (line) => {
      api.command.send('play_morse');
      return line.prepend('   OTWARTE   ', otwarteColor);
    },
    tag,
  );

  // Failed to open — show inline ZAMKNIETE! alert
  api.triggers.register(
    /^Probujesz otworzyc (.*), ale nie udaje ci sie to\.$/,
    (line) => line.prepend('ZAMKNIETE! ', cyanColor),
    tag,
  );

  // Hatch/plate dropped closed — color firebrick and bind F key to lift it
  api.triggers.register(
    /^.* ((?:krata|klapa|plyta|wlaz)) zamykaja\w+ .* na .*\.$/,
    (line, matches) => {
      if (!matches) return line;
      const accusative = ACCUSATIVE[matches[1]] ?? matches[1];
      const cmd = `podnies ${accusative}`;
      api.bind.set(cmd);
      line.color([0, line.text.length], firebrick);
      line.append(` [ ${api.bind.getLabel()} - ${cmd} ]`, goldColor);
      return line;
    },
    tag,
  );
}
