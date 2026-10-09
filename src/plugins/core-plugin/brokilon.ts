import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../lib/colors/my-ansi-colors';
import { getMyColor } from '../../lib/colors/my-colors';
import { renderFooterChip } from '../../lib/footerChip';
import { registerTextAlias } from '../../lib/registerTextAlias';
import { registerTokenGate } from '../../lib/registerTokenGate';
import { storage } from '../../lib/storage';
import { setBind } from './f';
import { BROKILON_SEARCH_PLACES, setupBrokilonSearch } from './brokilon-search';

const TAG = 'brokilon';
const HASLO1_KEY = 'brokilon:haslo1';
const DEFAULT_HASLO1 = 'Kirkaran';
const COUNTDOWN_SECONDS = 100;
const TRAP_PREFIX = /^\[ PULAPKA \]\s*/;
const ARROW_PREFIX = /^\[ STRZALY \]\s*/;

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
  const countdownStartColor = getMyColor(11, api);
  const warningColor = getMyColor(13, api);
  const dangerColor = getMyColor(6, api);

  let haslo1 = storage.get<string>(HASLO1_KEY) ?? DEFAULT_HASLO1;
  const haslo2 = '';
  let countdownTimer: ReturnType<typeof setInterval> | null = null;
  let countdownDeadline: number | null = null;
  let countdownFooter: ReturnType<PluginApi['ui']['registerFooterComponent']> | null = null;
  let brokilonEnabled = false;
  let waitingForStrapCut = false;
  const searchTracking = setupBrokilonSearch(api, () => brokilonEnabled);

  // ── Module toggle: brok+ / brok- ──────────────────────────────────────────
  api.aliases.register(/^brok\+$/i, () => {
    if (!brokilonEnabled) searchTracking.reset();
    brokilonEnabled = true;
    api.output.print('[Brokilon] module enabled');
    return true;
  });

  api.aliases.register(/^brok-$/i, () => {
    brokilonEnabled = false;
    stopCountdown();
    searchTracking.hide();
    waitingForStrapCut = false;
    api.output.print('[Brokilon] module disabled');
    return true;
  });

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

  const printFrame = (lines: string[]): void => {
    const width = Math.max(...lines.map((text) => text.length));
    const border = '─'.repeat(width + 2);
    api.output.print('');
    printColored(`┌${border}┐`, countdownStartColor);
    for (const text of lines) printColored(`│ ${text.padEnd(width)} │`, countdownStartColor);
    printColored(`└${border}┘`, countdownStartColor);
    api.output.print('');
  };

  const remainingSeconds = (): number | null => countdownDeadline === null
    ? null : Math.max(0, Math.ceil((countdownDeadline - Date.now()) / 1000));

  const clearCountdownTimer = (): void => {
    if (countdownTimer !== null) clearInterval(countdownTimer);
    countdownTimer = null;
  };

  const stopCountdown = (): void => {
    clearCountdownTimer();
    countdownDeadline = null;
    countdownFooter?.setVisible(false);
  };

  const renderCountdown = (seconds: number): void => {
    const content = renderFooterChip({
      label: 'Brokilon:',
      value: seconds > 0 ? `${seconds} s` : 'CZAS MINAL... zyjecie? 😆',
      tone: seconds <= 30 ? 'danger' : seconds <= 45 ? 'warn' : 'ok',
    });
    if (!countdownFooter) {
      countdownFooter = api.ui.registerFooterComponent('brokilon-timer', content, 'start');
    } else {
      countdownFooter.setContent(content);
    }
    countdownFooter.setVisible(true);
  };

  const startCountdown = (): void => {
    clearCountdownTimer();
    const deadline = Date.now() + COUNTDOWN_SECONDS * 1000;
    countdownDeadline = deadline;
    let previousSeconds = COUNTDOWN_SECONDS;
    renderCountdown(COUNTDOWN_SECONDS);
    printFrame(['[Brokilon] Odliczam 100 SEKUND... Good luck!']);

    countdownTimer = setInterval(() => {
      // Recompute from the deadline so delayed browser ticks do not extend the limit.
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (seconds === previousSeconds) return;
      renderCountdown(seconds);
      if (seconds === 0) {
        clearCountdownTimer();
        printBanner('[Brokilon] 100 SEKUND minelo... zyjecie? 😆', dangerColor);
      } else if (
        seconds <= 5 ||
        (previousSeconds > 10 && seconds <= 10) ||
        (previousSeconds > 30 && seconds <= 30) ||
        (previousSeconds > 45 && seconds <= 45)
      ) {
        printColored(
          `[Brokilon] Zostalo ${seconds} s!${seconds === 10 ? ' Moze czas wyjsc na gore?' : ''}`,
          seconds <= 10 ? color5 : warningColor,
        );
      }
      previousSeconds = seconds;
    }, 1000);
  };

  api.aliases.register(/^broktime_test$/i, () => {
    if (!brokilonEnabled) return true;
    startCountdown();
    return true;
  });

  api.aliases.register(/^brokstop$/i, () => {
    stopCountdown();
    api.output.print('[Brokilon] Odliczanie zatrzymane.');
    return true;
  });

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
      if (!brokilonEnabled) return line;
      line.color([0, line.text.length], color62);
      setBind(api, 'otworz grobowiec;przeszukaj grobowiec');
      return line;
    },
    TAG,
  );

  registerTokenGate(
    api,
    ['przedmiot', 'kluczyk'],
    [
      /^Znajdujesz(?: w (?:niej|nim))? (?:metalowy )?kluczyk\b/,
      /^(.+?) znajduje (?:jakis niewielki przedmiot|(?:w (?:niej|nim) )?(?:metalowy )?kluczyk)\b/,
    ],
    (line, matches) => {
      if (!brokilonEnabled) return line;
      const finder = matches[1];
      searchTracking.foundKey(finder);
      const seconds = remainingSeconds();
      printFrame([
        finder ? `[Brokilon] KLUCZYK! Znalazca: ${finder}` : '[Brokilon] ZNALAZLES KLUCZYK!',
        seconds === null ? 'Brak aktywnego odliczania.'
          : `Brawo, masz jeszcze ${seconds} sekund do konca imprezy!`,
      ]);
      setBind(api, 'take');
      return line;
    },
    TAG,
  );

  registerTokenGate(
    api,
    'kukielka',
    /Nagle.*podlatuje w gore, robi pol salta i zawisa bezwladnie, przywiaza\w+ do drzewa, by dyndac jak kukielka\./,
    (line) => {
      if (!brokilonEnabled) return line;
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
    'oplata',
    /Nagle czujesz, ze cos oplata twa noge\.\.\./,
    (line, _matches, _type, originalLine) => {
      if (!brokilonEnabled) return line;
      for (let i = 0; i < 3; i++) {
        printColored('          pulapka lapie mnie          ', ansi37);
      }
      api.command.send('play_basso');
      // The client's regular trigger already set the bind and corrected the map.
      // Replace only its visual formatting, using the original MUD text.
      const text = (originalLine ?? line.text).replace(TRAP_PREFIX, '');
      const restoredLine = new api.AnsiAwareBuffer(text);
      return restoredLine.color([0, text.length], ansi37);
    },
    TAG,
  );

  registerTokenGate(
    api,
    ['Isserath', 'Galiaar', 'Rzemienna'],
    /(?:Isserath|Galiaar|Rzemienna petla)/,
    (line) => {
      if (!brokilonEnabled) return line;
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
      if (!brokilonEnabled) return line;
      searchTracking.reset();
      startCountdown();
      return line;
    },
    TAG,
  );

  registerTokenGate(
    api,
    'Imie',
    /\s*Imie ich bylo (.*),/,
    (line, matches) => {
      if (!brokilonEnabled) return line;
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
    if (!brokilonEnabled) return true;
    api.command.send(`powiedz ${haslo1}`);
    return true;
  });

  api.aliases.register(/^ha2$/i, () => {
    if (!brokilonEnabled) return true;
    api.command.send(`powiedz ${haslo2}`);
    return true;
  });

  api.aliases.register(/^al!$/i, () => {
    if (!brokilonEnabled) return true;
    for (const cmd of [
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
    ]) {
      api.command.send(cmd);
    }
    return true;
  });

  api.aliases.register(/^ql$/i, () => {
    if (!brokilonEnabled) return true;
    api.command.send('ob grobowiec');
    return true;
  });

  api.aliases.register(/^take$/i, () => {
    if (!brokilonEnabled) return true;
    api.command.send('otworz trumne zdobionym kluczykiem');
    api.command.send('otworz trumne');
    api.command.send('wez wszystko z trumny');
    return true;
  });

  api.aliases.register(/^sjj$/i, () => {
    if (!brokilonEnabled) return true;
    for (const cmd of [
      'otworz grobowiec',
      'wez zloty klucz z grobowca',
      'otworz sarkofag',
      'wez zloty klucz z sarkofagu',
      'otworz trumne',
      'wez zloty klucz z trumny',
    ]) {
      api.command.send(cmd);
    }
    return true;
  });

  api.aliases.register(/^klr$/i, () => {
    if (!brokilonEnabled) return true;
    api.command.send('przeczytaj prawy napis');
    api.command.send('wloz zloty klucz do prawego zamka');
    return true;
  });

  api.aliases.register(/^kll$/i, () => {
    if (!brokilonEnabled) return true;
    api.command.send('przeczytaj lewy napis');
    api.command.send('wloz zloty klucz do lewego zamka');
    return true;
  });

  api.aliases.register(/^xb$/i, () => {
    if (!brokilonEnabled) return true;
    const cmds = [
      'otworz grobowiec',
      'wez wszystkie zbroje z grobowca',
      'odloz je',
      'wez wszystko z grobowca',
      'odloz szczatki',
    ];
    for (const cmd of cmds) api.command.send(cmd);
    return true;
  });

  api.aliases.register(/^szu$/i, () => {
    if (!brokilonEnabled) return true;
    api.command.send('otworz grobowiec');
    api.command.send('przeszukaj grobowiec');
    return true;
  });

  api.aliases.register(/^cut$/i, () => {
    if (!brokilonEnabled) return true;
    waitingForStrapCut = true;
    for (const cmd of ['dobs', 'przetnij rzemien']) {
      api.command.send(cmd);
    }
    return true;
  });

  registerTokenGate(
    api,
    'Przecinasz',
    /^Przecinasz rzemien\.$/,
    (line) => {
      if (waitingForStrapCut) {
        waitingForStrapCut = false;
        api.command.send('opus');
      }
      return line;
    },
    TAG,
  );

  for (const { alias, target } of BROKILON_SEARCH_PLACES) {
    api.aliases.register(new RegExp(`^${alias}$`, 'i'), () => {
      if (!brokilonEnabled) return true;
      api.command.send(`przeszukaj ${target}`);
      return true;
    });
  }

  // Arrows hitting the ground or a person share the same local alert.
  registerTokenGate(
    api,
    'strzala',
    [
      /^W ziemie wbila sie z niesamowita predkoscia.*strzala\./i,
      /^(?:Nagle jakas|Nadlatujaca ze swistem).*strzala .*\./i,
    ],
    (line, _matches, _type, originalLine) => {
      if (!brokilonEnabled) return line;
      const prefix = '  ***  STRZALA  ***  ';
      const text = (originalLine ?? line.text).replace(ARROW_PREFIX, '');
      const restoredLine = new api.AnsiAwareBuffer(text);
      restoredLine.prepend(prefix, ansi37);
      api.command.send('play_tink');
      return restoredLine;
    },
    TAG,
  );

  return () => {
    searchTracking.destroy();
    stopCountdown();
    countdownFooter?.remove();
    countdownFooter = null;
    waitingForStrapCut = false;
  };
}
