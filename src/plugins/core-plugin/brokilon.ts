import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../lib/colors/my-ansi-colors';
import { getMyColor } from '../../lib/colors/my-colors';
import { registerTextAlias } from '../../lib/registerTextAlias';
import { registerTokenGate } from '../../lib/registerTokenGate';
import { storage } from '../../lib/storage';
import { setBind } from './f';

const TAG = 'brokilon';
const HASLO1_KEY = 'brokilon:haslo1';
const DEFAULT_HASLO1 = 'Kiranhim';

function registerSequenceAlias(api: PluginApi, pattern: RegExp, commands: string[]): void {
  api.aliases.register(pattern, () => {
    for (const command of commands) api.command.send(command);
    return true;
  });
}

export function setupBrokilon(api: PluginApi): () => void {
  const ansi5 = getAnsiFormatState(5, api);
  const ansi37 = getAnsiFormatState(37, api);
  const color5 = getMyColor(5, api);
  const color62 = getAnsiFormatState(62, api);

  let haslo1 = storage.get<string>(HASLO1_KEY) ?? DEFAULT_HASLO1;
  const haslo2 = '';
  let tickWarningTimer: ReturnType<typeof setTimeout> | null = null;

  const printColored = (text: string, color: typeof ansi5): void => {
    const buffer = new api.AnsiAwareBuffer(text);
    buffer.color([0, text.length], color);
    api.output.print(buffer);
  };

  const printBanner = (text: string, color: typeof ansi5): void => {
    api.output.print('');
    printColored(text, color);
    api.output.print('');
  };

  // This source trigger had enabled="false". Keep its implementation here,
  // but preserve that disabled state when loading the plugin.
  const enableTwoMinuteAlert = false;
  if (enableTwoMinuteAlert) {
    registerTokenGate(
      api,
      'katakumb',
      /Dobiega cie echo glosnego huku, powodujacego drzenie calych katakumb!/,
      (line) => {
        printBanner('     D W I E       M I N U T Y     !!!', ansi5);
        return line;
      },
      TAG,
    );
  }

  registerTokenGate(
    api,
    'grobowiec',
    /^Zamkniety zloty grobowiec\./,
    (line) => {
      line.color([0, line.text.length], color62);
      setBind(api, 'otworz grobowiec;przeszukaj grobowiec');
      return line;
    },
    TAG,
  );

  registerTokenGate(
    api,
    ['przedmiot', 'kluczyk'],
    /^(?:.*znajduje jakis niewielki przedmiot|Znajdujesz w niej metalowy kluczyk)/,
    (line) => {
      printBanner('   K L U C Z Y K  !!!', ansi5);
      return line;
    },
    TAG,
  );

  registerTokenGate(
    api,
    'kukielka',
    /Nagle.*podlatuje w gore, robi pol salta i zawisa bezwladnie, przywiaza\w+ do drzewa, by dyndac jak kukielka\./,
    (line) => {
      for (let i = 0; i < 3; i++) {
        printColored('          ktos zawisl          ', ansi37);
      }
      api.command.send('play_basso');
      return line;
    },
    TAG,
  );

  registerTokenGate(
    api,
    ['Isserath', 'Galiaar', 'Rzemienna'],
    /(?:Isserath|Galiaar|Rzemienna petla)/,
    (line) => {
      line.color([0, line.text.length], color5);
      return line;
    },
    TAG,
  );

  registerTokenGate(
    api,
    'zgrzytem',
    /^Po wlozeniu drugiego klucza wrota otwieraja sie z ciezkim zgrzytem!/,
    (line) => {
      api.command.send('napelnij lampe olejem');
      api.command.send('sus2');
      printBanner('     1 0 0       S E K U N D     !!!', ansi5);

      if (tickWarningTimer) clearTimeout(tickWarningTimer);
      tickWarningTimer = setTimeout(() => {
        tickWarningTimer = null;
        api.output.print('TICK IN 5 SECONDS.');
      }, 95_000);

      api.output.print('--> Odliczam 100 sekund!');
      return line;
    },
    TAG,
  );

  registerTokenGate(
    api,
    'Imie',
    /\s*Imie ich bylo (.*),/,
    (line, matches) => {
      haslo1 = matches[1].trim();
      try {
        storage.set(HASLO1_KEY, haslo1);
      } catch {
        // Keep the learned password in memory when localStorage is unavailable.
      }
      api.output.print(`--> Zlapalem nowe haslo: '${haslo1}'`);
      return line;
    },
    TAG,
  );

  api.aliases.register(/^ha1$/i, () => {
    api.command.send(`powiedz ${haslo1}`);
    return true;
  });

  api.aliases.register(/^ha2$/i, () => {
    api.command.send(`powiedz ${haslo2}`);
    return true;
  });

  registerSequenceAlias(api, /^al!$/i, [
    'ob lewy posag',
    'ob dlon',
    'ob prawy posag',
    'ob ksiege',
    'ob wrota',
    'ob kolumny',
    'ob dziurke?',
    'ob polke',
    'ob posadzke',
    'ob kafelki',
    'ob obluzowany kafelek',
    'ob kafelek',
    'ob piedestaly',
    'ob czwarty puginal',
    'ob czwarty piedestal',
    'ob piaty piedestal',
    'ob srodkowy posag',
    'ob miecz',
    'ob rekojesc',
    'ob helm',
    'ob dlonie',
    'ob uszy',
    'ob oczy',
    'ob usta',
    'ob stopy',
    'ob buty',
    'ob glowice',
  ]);

  registerTextAlias(api, /^ql$/i, 'ob grobowiec');
  registerSequenceAlias(api, /^sjj$/i, [
    'otworz grobowiec',
    'wez zloty klucz z grobowca',
    'otworz sarkofag',
    'wez zloty klucz z sarkofagu',
    'otworz trumne',
    'wez zloty klucz z trumny',
  ]);
  registerSequenceAlias(api, /^klr$/i, ['przeczytaj prawy napis', 'wloz zloty klucz do prawego zamka']);
  registerSequenceAlias(api, /^kll$/i, ['przeczytaj lewy napis', 'wloz zloty klucz do lewego zamka']);
  registerSequenceAlias(api, /^xb$/i, [
    'otworz grobowiec',
    'wez wszystkie zbroje z grobowca',
    'odloz je',
    'wez wszystko z grobowca',
    'odloz szczatki',
  ]);
  registerSequenceAlias(api, /^szu$/i, ['otworz grobowiec', 'przeszukaj grobowiec']);
  registerSequenceAlias(api, /^cut$/i, ['dobs', 'przetnij rzemien', 'opus']);

  const searchAliases: Record<string, string> = {
    p1: 'przeszukaj dlon',
    p2: 'przeszukaj ksiege',
    p3: 'przeszukaj kafelek',
    p4: 'przeszukaj polke',
    p5: 'przeszukaj dziure',
    p6: 'przeszukaj piedestaly',
  };
  for (const [alias, command] of Object.entries(searchAliases)) {
    registerTextAlias(api, new RegExp(`^${alias}$`, 'i'), command);
  }

  // brok_arrow1: arrow hits the ground
  registerTokenGate(
    api,
    'strzala',
    /^W ziemie wbila sie z niesamowita predkoscia.*strzala\./i,
    (line) => {
      const prefix = '  ***  STRZALA  ***  ';
      line.replace([0, line.text.length], prefix + line.text);
      line.color([0, prefix.length], ansi37);
      api.command.send('play_tink');
      return line;
    },
    TAG,
  );

  // brok_arrow2: arrow approaches
  registerTokenGate(
    api,
    'strzala',
    /^(?:Nagle jakas|Nadlatujaca ze swistem).*strzala .*\./i,
    (line) => {
      const prefix = '  ***  STRZALA  ***  ';
      line.replace([0, line.text.length], prefix + line.text);
      line.color([0, prefix.length], ansi37);
      api.command.send('play_tink');
      return line;
    },
    TAG,
  );

  return () => {
    if (tickWarningTimer) clearTimeout(tickWarningTimer);
    tickWarningTimer = null;
  };
}
