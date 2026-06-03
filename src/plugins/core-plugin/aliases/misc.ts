import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../../lib/registerTextAlias';
import { makeTemp } from '../../../lib/makeTemp';
import { withDelay } from '../../../lib/withDelay';
import { findMatchRange } from '../../../lib/findMatchRange';
import { getMyColor } from '../../../lib/colors/my-colors';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';

export function setupMiscAliases(api: PluginApi): void {
  // maketemp <pattern> <cmd1;cmd2;...>
  // Arms a one-shot trigger: fires commands once when pattern appears in output.
  api.aliases.register(/^maketemp\s+(\S+)\s+(.+)$/, (matches) => {
    makeTemp(api, matches![1], matches![2]);
    return true;
  });

  // szuk! <pattern> - one-shot search: highlights the match and shows a visual alert
  {
    const matchColor = getAnsiFormatState(115, api);
    const artColor = getMyColor(3, api);
    const artLines = ['                  ooo       ', '                ooooooo     ', '                  ooo       '];

    api.aliases.register(/^szuk!\s+(.+)$/, (matches) => {
      const pattern = matches![1].trim();

      let regex: RegExp;
      try {
        regex = new RegExp(pattern, 'i');
      } catch {
        api.output.print(`[szuk!] invalid pattern: ${pattern}`);
        return true;
      }

      api.output.print(`--> Szukam: ${pattern}`);

      api.triggers.registerOneTime(regex, (line, triggerMatches) => {
        const range = findMatchRange(line.text, triggerMatches?.[0] ?? '');
        if (range) line.color(range, matchColor);

        api.command.send('play_tink');

        api.output.print('');
        for (const artLine of artLines) {
          const buf = new api.AnsiAwareBuffer(artLine);
          buf.color([0, artLine.length], artColor);
          api.output.print(buf);
        }
        api.output.print('');

        return line;
      });

      return true;
    });
  }

  // na_statek - arm a one-shot trigger that shows a visual block when boarding succeeds
  {
    const blockColor = getAnsiFormatState(34, api);
    const blockLines = ['                            ', '     WLAZLES NA STATEK!     ', '                            '];
    const oneShotTag = 'na_statek_oneshot';

    api.aliases.register(/^na_statek$/, () => {
      api.triggers.removeByTag(oneShotTag);
      api.triggers.registerOneTime(/^Wchodzisz/, (line) => {
        for (const l of blockLines) {
          const buf = new api.AnsiAwareBuffer(l);
          buf.color([0, l.length], blockColor);
          api.output.print(buf);
        }
        return line;
      }, oneShotTag);
      return true;
    });
  }

  // ze - quick look (optional direction)
  registerTextAlias(api, /^ze(?:\s+(.+))?$/, 'zerknij');

  // br - knock on gate
  api.aliases.register(/^br$/, () => {
    api.command.send('zastukaj we wrota');
    return true;
  });

  // br2 - ring bell/gong/pull cord
  api.aliases.register(/^br2$/, () => {
    api.command.send('uderz w dzwon');
    api.command.send('uderz w gong');
    api.command.send('pociagnij sznurek');
    api.command.send('pociagnij linke');
    return true;
  });

  // liczpatrol - count patrol members
  api.aliases.register(/^liczpatrol$/, () => {
    api.command.send('policz pikinierow');
    api.command.send('policz tarczownikow');
    api.command.send('policz sierzantow');
    api.command.send('policz chorazych');
    return true;
  });

  // hi - hide
  api.aliases.register(/^hi$/, () => {
    api.command.send('schowaj');
    return true;
  });

  // tab - read notice boards / tablets
  api.aliases.register(/^tab$/, () => {
    api.command.send('ob tabliczke');
    api.command.send('ob pergamin');
    api.command.send('pr tablice');
    return true;
  });

  // i1-i5 - movement speeds
  const speeds: Record<string, string> = {
    '1': 'niespiesznie',
    '2': 'marszem',
    '3': 'truchtem',
    '4': 'biegiem',
    '5': 'szybkim biegiem',
  };
  api.aliases.register(/^i([1-5])$/, (matches) => {
    const speed = speeds[matches![1]];
    if (speed) api.command.send(`idz ${speed}`);
    return true;
  });

  // ooo - pull down hood
  api.aliases.register(/^ooo$/, () => {
    api.command.send('sciagnij kaptur');
    return true;
  });

  // pile <target> - throw ball at target, pick it back up after a short delay
  api.aliases.register(/^pile(?:\s+(.+))?$/, (matches) => {
    const target = matches?.[1]?.trim().toLowerCase();
    if (!target) return true;
    api.command.send(`rzuc pileczka w ${target}`);
    withDelay(234, 890, () => api.command.send('wez pileczke'));
    return true;
  });

  // zpla - put on cloak and fasten with brooch
  api.aliases.register(/^zpla$/, () => {
    api.command.send('zaloz plaszcz');
    api.command.send('zepnij plaszcz spinka');
    return true;
  });

  // ++ - light candle
  api.aliases.register(/^\+\+$/, () => {
    api.command.send('zapal swiece');
    return true;
  });

  // ´´ - extinguish candle
  api.aliases.register(/^´´$/, () => {
    api.command.send('zdmuchnij swiece');
    return true;
  });

  // opw - board a carriage/wagon/coach
  api.aliases.register(/^opw$/, () => {
    api.command.send('otworz zalozona torbe');
    api.command.send('wsiadz do dylizansu');
    api.command.send('wsiadz do wozu');
    api.command.send('wsiadz do powozu');
    api.command.send('zamknij zalozona torbe');
    return true;
  });

  // logg - mark an interesting section in the log
  api.aliases.register(/^logg$/, () => {
    api.output.print('');
    api.output.print('');
    api.output.print('OKOLICE CIEKAWEGO MIEJSCA W LOGU');
    api.output.print('');
    return true;
  });

  // pjpb - quick browse
  api.aliases.register(/^pjpb$/, () => {
    api.command.send('przejrzyj pobieznie');
    return true;
  });

  // kt - who is online
  api.aliases.register(/^kt$/, () => {
    api.command.send('kto');
    return true;
  });

  // wj - point at (optional target)
  registerTextAlias(api, /^wj(?:\s+(.+))?$/, 'wskaz');

  // brr - shake off water (8 times)
  api.aliases.register(/^brr$/, () => {
    for (let i = 0; i < 8; i++) {
      api.command.send('otrzasnij wode');
    }
    return true;
  });

  // piek! - order bread at bakery
  api.aliases.register(/^piek!$/, () => {
    api.command.send('otm');
    for (let i = 0; i < 2; i++) api.command.send('zamow bulke');
    for (let i = 0; i < 2; i++) api.command.send('zamow bagietke');
    for (let i = 0; i < 2; i++) api.command.send('zamow chleb');
    api.command.send('ztm');
    return true;
  });

  // napwsz - sharpen all weapons and repair all armor
  api.aliases.register(/^napwsz$/, () => {
    api.command.send('otworz zalozona torbe');
    api.command.send('dob');
    api.command.send('naostrz wszystkie bronie');
    api.command.send('napraw wszystkie zbroje');
    return true;
  });


  // ti! / ti!+ - stopwatch timer
  {
    let timerStart: number | null = null;

    api.aliases.register(/^ti!$/, () => {
      if (timerStart === null) {
        timerStart = Date.now();
        api.output.print('--> Czas start!');
      } else {
        const elapsed = ((Date.now() - timerStart) / 1000).toFixed(1);
        api.output.print(`--> Koniec! Czas: ${elapsed} sek.`);
        timerStart = null;
      }
      return true;
    });

    api.aliases.register(/^ti!\+$/, () => {
      timerStart = Date.now();
      api.output.print('--> Czas start! (reset)');
      return true;
    });
  }

  // zakrec! - spin the wheel: prints a suspenseful sequence then reveals a random result
  api.aliases.register(/^zakrec!$/, () => {
    const items = ['exp', 'idl', 'spac', 'piwo', 'pk', 'klucze'];
    const steps: [string, number][] = [
      ['Krece korba!!!', 2000],
      ['Kreci..', 2000],
      ['Kreci......', 3000],
      ['Ciagle kreci.....', 4000],
    ];
    let offset = 0;
    for (const [msg, wait] of steps) {
      setTimeout(() => api.output.print(msg), offset);
      offset += wait;
    }
    setTimeout(() => {
      const result = items[Math.floor(Math.random() * items.length)].toUpperCase();
      const spaced = result.split('').join(' ');

      const innerWidth = 28;
      const center = (s: string) => {
        const pad = innerWidth - s.length;
        return ' '.repeat(Math.floor(pad / 2)) + s + ' '.repeat(Math.ceil(pad / 2));
      };

      const bar = '═'.repeat(innerWidth);
      const resultColor = getMyColor(13, api);
      const borderColor = getMyColor(14, api);

      const rows: [string, ReturnType<typeof getMyColor>][] = [
        [`╔${bar}╗`, borderColor],
        [`║${center('W Y N I K :')}║`, borderColor],
        [`║${center(spaced)}║`, resultColor],
        [`╚${bar}╝`, borderColor],
      ];

      api.output.print('');
      for (const [text, color] of rows) {
        const buf = new api.AnsiAwareBuffer(text);
        buf.color([0, text.length], color);
        api.output.print(buf);
      }
      api.output.print('');
    }, offset);
    return true;
  });

  // gale! - navigate through the galeon in sequence with random delays between steps
  api.aliases.register(/^gale!$/, () => {
    const rooms = [
      'dziob',
      'sterburta',
      'd',
      'kajuta',
      'korytarz',
      'rufa',
      'druga',
      'korytarz',
      'pierwsza',
      'korytarz',
      'rufa',
      'czwarta',
      'korytarz',
      'trzecia',
      'korytarz',
      'dziob',
      'dziob',
      'u',
      'srodokrecie',
      'rufa',
      'bakburta',
      'srodokrecie',
    ];
    let i = 0;
    const step = () => {
      if (i >= rooms.length) return;
      api.command.send(rooms[i++]);
      if (i < rooms.length) withDelay(56, 234, step);
    };
    step();
    return true;
  });

  // #region hide+ - hide from association listing and stash signet ring
  api.aliases.register(/^hide\+$/, () => {
    api.command.send('opcje stowarzyszenie -');
    api.command.send('snzsun');
    return true;
  });

  // #region hide- - appear in association listing and wear signet ring
  api.aliases.register(/^hide-$/, () => {
    api.command.send('opcje stowarzyszenie +');
    api.command.send('wsun kunsztowny sygnet na palec serdeczny');
    return true;
  });

  // #region radoor [door] [direction] - open door with signet ring, go through, re-lock
  api.aliases.register(/^radoor\s+(\S+)\s+(\S+)$/, (matches) => {
    const co = matches![1];
    const kier = matches![2];
    api.command.send(`otworz ${co} kunsztownym sygnetem`);
    api.command.send(kier);
    api.command.send(`zamknij ${co}`);
    api.command.send(`zamknij ${co} kunsztownym sygnetem`);
    return true;
  });

  api.aliases.register(/^rp\!/, () => {
    api.command.send('/reload-plugins');
    return true;
  });

  // mran - send a random exit from the current room
  {
    const dirToCmd: Record<string, string> = {
      north: 'n',
      south: 's',
      east: 'e',
      west: 'w',
      northeast: 'ne',
      northwest: 'nw',
      southeast: 'se',
      southwest: 'sw',
      up: 'u',
      down: 'd',
      in: 'in',
      out: 'out',
    };

    api.aliases.register(/^mran$/, () => {
      const room = api.map.getRoom();
      if (!room) {
        api.output.print('[mran] brak danych mapy');
        return true;
      }

      const exits = [
        ...Object.keys(room.exits).map((dir) => dirToCmd[dir] ?? dir),
        ...Object.keys(room.specialExits ?? {}),
      ];

      if (exits.length === 0) {
        api.output.print('[mran] brak wyjsc');
        return true;
      }

      const chosen = exits[Math.floor(Math.random() * exits.length)];
      api.command.send(chosen);
      return true;
    });
  }

  // sig <text> - print styled message to output
  api.aliases.register(/^sig(?:\s+(.+))?$/, (matches) => {
    const text = matches?.[1]?.trim() ?? '';
    api.output.print(`--> ${text}`);
    return true;
  });

  // przepasc! - loud warning about a chasm
  api.aliases.register(/^przepasc!$/, () => {
    api.output.print('  TAM PRZEPASC!  ');
    return true;
  });

  // < <item> - sell item
  registerTextAlias(api, /^<(?:\s+(.+))?$/, 'sprzedaj');

  // keys - display key reference list
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
