import type { FormatStateSnapshot, PluginApi } from '@arkadia/plugin-types';
import type { Liczba, Przypadek, Role, WpisLokalny, Ziarno } from '../../shared/rkg-api';
import { LICZBY, PRZYPADKI } from '../../shared/rkg-api';
import type { Baza } from './store';
import type { RkgStyles } from './styles';
import { RKG_PRZYMIOTNIKI } from './data/adjectives';
import { RZECZOWNIKI_SEED } from './data/seed';
import { RKG_TYPY } from './data/types';
import { pick } from './generator';
import { printClubTable } from './presentation';
import { registerTokenGate } from '../../lib/registerTokenGate';
import { showClubInput } from './visible-input';

/**
 * `rkg!` drives the dialogue and picks options; `rkgman!` records the player's
 * answers. Both record the full club. PREVIEW ONLY: at the final "Czy chcesz
 * stworzyc taki klub?" prompt the runner sends `**` to cancel. It NEVER sends
 * `tak`; no club is ever founded.
 *
 * Why harvest instead of using the static lists: the option pools come from the
 * MUD and drift over time, and crucially the three leadership-title menus
 * (przywodca / zastepca / szeregowy czlonek) differ from one club type to the
 * next. So the type menu and the three title menus are read from the game's own
 * `* option` lines and chosen at random. Empty menus cancel the preview.
 *
 * The nouns are the exception: their pool barely changes, so rather than walk
 * the category sub-menus on every run (an extra round-trip that spams the game),
 * we keep a comprehensive static base in `data/seed.ts` and answer the noun
 * prompt directly with a random one, retrying rejected words without replacement.
 *
 * Prompt-driven, not timer-driven: each answer is sent only after the game's
 * actual question for that step arrives (verbatim from a real transcript). All
 * triggers are armed on demand (tags `rkgKreator` for the step one-shots,
 * `rkgMenu` for the transient collectors) and removed as the run advances, so
 * the plugin never adds anything to the client's always-on per-line walk.
 */

export const TAG_KREATOR = 'rkgKreator';
export const TAG_MENU = 'rkgMenu';

const GAP_MIN = 450;
const GAP_MAX = 900;
const WATCHDOG_MS = 15000;

// Bound both static-word retries and live-menu retries per question.
const MAX_ATTEMPTS = 5;
// A bullet begins a line or a tab-separated menu cell. Only words are answers;
// **, prose containing punctuation, and non-bullet explanations are excluded.
const MENU_OPTION = /(?:^|[\r\n\t])[ ]*\*[ ]+([a-z]+(?:[ ]+[a-z]+)*)[ ]*(?=$|[\r\n\t])/gi;

const SUMMARY_NAME = /^Podsumowujac, nowy klub bedzie sie nazywal:/i;
const SUMMARY_LEADER = /^Przywod(?:ca|czyni) bedzie nosi(?:l|la) tytul:/i;
const SUMMARY_DEPUTY = /^Zastep(?:ca|czyni) przywod(?:cy|czyni) bedzie nosi(?:l|la) tytul:/i;
const SUMMARY_MEMBER = /^Szeregow(?:y czlonek|a czlonkini) klubu bedzie nosi(?:l|la) tytul:/i;

interface Prompt {
  re: RegExp;
  fn: (m: RegExpMatchArray) => void;
  onPrompt?: (text: string) => void;
}

const CHARAKTER = 'jawny';
const PLEC = 'dowolnej';

interface Ctx {
  manual?: boolean;
  charakter?: string;
  odtwarzana?: string;
  ziarno?: Ziarno;
  typ?: string;
  /** What we answered, or what the type dictated when the question was skipped. */
  plec?: string;
  przymiotnik?: string;
  rzeczownik?: string;
  liczba?: Liczba;
  przypadek?: Przypadek;
  wynik?: string;
  role: Partial<Role>;
  pendingRola: keyof Role | null;
  pendingNazwa: boolean;
}

export interface Kreator {
  zatrzymaj(): void;
  odtworz(nazwa: string, ziarno: Ziarno): void;
}

export function setupKreator(
  api: PluginApi,
  baza: Baza,
  styles: RkgStyles,
  // Called once a run has produced a complete club, so the RKG window can
  // offer to publish it. Optional so the runner stands alone in tests.
  poZakonczeniu?: (w: WpisLokalny) => void,
): Kreator {
  let ctx: Ctx | null = null;
  let delayed: ReturnType<typeof setTimeout> | null = null;
  let rejected: Prompt | null = null;
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  let manualHookId: string | null = null;
  let manualPrompt: string | null = null;
  let manualSummaryArmed = false;
  let manualFinalizing = false;
  let restoreInput: (() => void) | null = null;
  let watchingDisconnect = false;

  const drukuj = (tekst: string, kolor: FormatStateSnapshot) => {
    const buf = new api.AnsiAwareBuffer(tekst);
    buf.color([0, tekst.length], kolor);
    api.output.print(buf);
  };
  const send = (tekst: string) => {
    if (ctx && tekst !== 'utworz klub' && tekst !== '**') {
      drukuj(`[rkg] > ${tekst}`, styles.info);
    }
    return api.command.send(tekst, false);
  };
  const post = (i: number, id: string) => drukuj(`[rkg] ${i} ${id}`, styles.info);

  const czyscWatchdog = () => {
    if (watchdog !== null) {
      clearTimeout(watchdog);
      watchdog = null;
    }
  };

  const sprzatnij = () => {
    czyscWatchdog();
    if (delayed !== null) clearTimeout(delayed);
    delayed = null;
    rejected = null;
    api.triggers.removeByTag(TAG_KREATOR);
    api.triggers.removeByTag(TAG_MENU);
    if (manualHookId) api.commandHooks.unregister(manualHookId);
    manualHookId = null;
    manualPrompt = null;
    manualSummaryArmed = false;
    manualFinalizing = false;
    restoreInput?.();
    restoreInput = null;
    if (watchingDisconnect) api.events.off('client.disconnect', onDisconnect);
    watchingDisconnect = false;
    ctx = null;
  };

  const przerwij = (powod: string, wyslijAbort: boolean) => {
    if (!ctx) return;
    if (wyslijAbort) send('**');
    sprzatnij();
    drukuj(`[rkg] przerwano: ${powod}`, styles.info);
  };

  function onDisconnect(): void {
    przerwij('rozlaczono', false);
  }

  const pokazOdpowiedzi = () => {
    restoreInput = showClubInput();
    api.events.on('client.disconnect', onDisconnect);
    watchingDisconnect = true;
  };

  const ustawWatchdog = (gdzie: string) => {
    czyscWatchdog();
    watchdog = setTimeout(() => przerwij(`brak odpowiedzi gry (${gdzie})`, true), WATCHDOG_MS);
  };

  /** Wait for the next question OR a repetition of the submitted question. */
  const czekajNaJedno = (warianty: Prompt[]) => {
    ustawWatchdog(warianty.map((w) => w.re.source).join(' / '));
    const biezacy = ctx;
    const prompts = rejected ? [...warianty, rejected] : warianty;
    let handled = false;
    for (const { re, fn, onPrompt } of prompts) {
      api.triggers.registerOneTime(
        re,
        (line, matches) => {
          if (!ctx || ctx !== biezacy || handled) return line;
          handled = true;
          try {
            czyscWatchdog();
            api.triggers.removeByTag(TAG_KREATOR);
            api.triggers.removeByTag(TAG_MENU);
            // Fixed answers cannot safely be varied: cancel if rejected.
            rejected = { re, fn: () => przerwij(`odrzucona odpowiedz (${re.source})`, true) };
            onPrompt?.(line.text);
            delayed = setTimeout(() => {
              delayed = null;
              if (ctx !== biezacy) return;
              try {
                api.triggers.removeByTag(TAG_MENU);
                fn(matches);
              } catch (e) {
                przerwij(`blad: ${String(e)}`, true);
              }
            }, Math.floor(Math.random() * (GAP_MAX - GAP_MIN) + GAP_MIN));
          } catch (e) {
            przerwij(`blad: ${String(e)}`, true);
          }
          return line;
        },
        TAG_KREATOR,
      );
    }
  };

  const czekaj = (re: RegExp, fn: Prompt['fn']) => czekajNaJedno([{ re, fn }]);

  /** Submit unused candidates; a repeated question keeps this attempt history. */
  const wyborKrok = (
    re: RegExp, nazwa: string, uzyj: (wybor: string) => void,
    stale?: readonly string[], wymus?: string,
  ) => {
    const proby = new Set<string>();
    let opcje: string[] = [];
    const zbierz = (text: string) => {
      for (const m of text.matchAll(MENU_OPTION)) {
        const option = m[1].trim().toLowerCase();
        if (option !== 'tak' && !opcje.includes(option)) opcje.push(option);
      }
    };
    const prompt: Prompt = {
      re,
      onPrompt: stale ? undefined : (text) => {
        opcje = [];
        zbierz(text);
        // Transient structural parser: bullets have no common word to gate on.
        api.triggers.register(/\*/, (line) => {
          zbierz(line.text);
          return line;
        }, TAG_MENU);
      },
      fn: () => {
        const dostepne = (stale ?? opcje).filter((x) => !proby.has(x));
        if (!dostepne.length || proby.size >= MAX_ATTEMPTS) {
          przerwij(`${nazwa}: ${proby.size ? 'odrzucone odpowiedzi, brak bezpiecznej kolejnej proby' : 'brak poprawnych opcji w menu'}`, true);
          return;
        }
        if (wymus && !dostepne.includes(wymus)) {
          przerwij(`${nazwa}: brak wybranej opcji ${wymus}`, true);
          return;
        }
        const wybor = wymus ?? pick(dostepne);
        proby.add(wybor);
        rejected = prompt;
        uzyj(wybor);
      },
    };
    czekajNaJedno([prompt]);
  };

  const menuKrok = (re: RegExp, nazwa: string, uzyj: (wybor: string) => void) =>
    wyborKrok(re, nazwa, uzyj);

  // ── The dialogue, step by step ────────────────────────────────────────────

  const krokCharakter = () => {
    post(1, 'charakter');
    czekaj(/Jaki charakter ma miec klub/i, () => {
      send(CHARAKTER);
      krokTyp();
    });
  };

  const krokTyp = () => {
    post(2, 'typ');
    wyborKrok(/Jakiego typu ma to byc klub/i, 'typ klubu', (typ) => {
      ctx!.typ = typ;
      send(typ);
      krokPlec();
    }, undefined, ctx?.ziarno?.typ);
  };

  // Gender-locked types (`braterstwo`, ...) are never asked about plec: the game
  // states the restriction and jumps straight to the name question. So wait for
  // either prompt, with a transient collector picking up the restriction line so
  // the record stays accurate.
  const krokPlec = () => {
    post(3, 'plec');
    api.triggers.register(
      /pozwala na przyjmowanie wylacznie (mezczyzn|kobiet)/i,
      (line, m) => {
        if (ctx && m?.[1]) ctx.plec = m[1].toLowerCase() === 'kobiet' ? 'zenskiej' : 'meskiej';
        return line;
      },
      TAG_MENU,
    );
    czekajNaJedno([
      {
        re: /Jakiej plci maja byc czlonkowie/i,
        fn: () => {
          api.triggers.removeByTag(TAG_MENU);
          ctx!.plec = PLEC;
          send(PLEC);
          krokNazwa();
        },
      },
      {
        re: /Jaka ma byc nazwa klubu/i,
        fn: () => {
          // plec was skipped — the type dictates it, and the collector above has
          // already recorded which. Fold in what krokNazwa would have done.
          api.triggers.removeByTag(TAG_MENU);
          send('nazwa');
          krokRzeczownik();
        },
      },
    ]);
  };

  const krokNazwa = () => {
    post(4, 'nazwa');
    czekaj(/Jaka ma byc nazwa klubu/i, () => {
      send('nazwa');
      krokRzeczownik();
    });
  };

  // Answer the noun prompt directly from the static base — no walking the
  // category sub-menus, so the run stays to a single round-trip here.
  const krokRzeczownik = () => {
    post(5, 'rzeczownik');
    wyborKrok(/Podaj rzeczownik lub wyswietl/i, 'rzeczownik', (noun) => {
      ctx!.rzeczownik = noun;
      send(noun);
      krokPrzymiotnik();
    }, RZECZOWNIKI_SEED, ctx?.ziarno?.rzeczownik);
  };

  const krokPrzymiotnik = () => {
    post(6, 'przymiotnik');
    wyborKrok(/Podaj przymiotnik/i, 'przymiotnik', (adj) => {
      ctx!.przymiotnik = adj;
      send(adj);
      krokLiczbaLubPrzypadek();
    }, RKG_PRZYMIOTNIKI, ctx?.ziarno?.przymiotnik);
  };

  const wyslijPrzypadek = () => {
    const p = ctx?.ziarno?.przypadek ?? pick(PRZYPADKI) as Przypadek;
    ctx!.przypadek = p;
    send(p);
    krokPrzywodca();
  };

  // The game asks about liczba only for nouns that have both numbers. For a
  // plurale tantum noun it skips straight to przypadek, so we wait for either.
  const krokLiczbaLubPrzypadek = () => {
    post(7, 'liczba/przypadek');
    czekajNaJedno([
      {
        re: /w liczbie pojedynczej czy mnogiej/i,
        fn: () => {
          const l = ctx?.ziarno?.liczba ?? pick(LICZBY) as Liczba;
          ctx!.liczba = l;
          send(l);
          krokPrzypadek();
        },
      },
      {
        re: /W jakim przypadku gramatycznym/i,
        fn: () => {
          // liczba was skipped — a plurale tantum name is inherently plural.
          ctx!.liczba = 'mnogiej';
          wyslijPrzypadek();
        },
      },
    ]);
  };

  const krokPrzypadek = () => {
    post(8, 'przypadek');
    czekaj(/W jakim przypadku gramatycznym/i, wyslijPrzypadek);
  };

  const krokPrzywodca = () => {
    post(9, 'tytul przywodcy');
    menuKrok(/Wybierz tytul dla przywod(?:cy|czyni)/i, 'tytul przywodcy', (t) => {
      send(t);
      krokZastepca();
    });
  };

  const krokZastepca = () => {
    post(10, 'tytul zastepcy');
    menuKrok(/Wybierz tytul dla zastep(?:cy|czyni) przywod(?:cy|czyni)/i, 'tytul zastepcy', (t) => {
      send(t);
      krokSzeregowy();
    });
  };

  const krokSzeregowy = () => {
    post(11, 'tytul czlonka');
    menuKrok(/Wybierz tytul dla szeregow(?:ego czlonka|ej czlonkini)/i, 'tytul czlonka', (t) => {
      send(t);
      krokGest();
    });
  };

  const krokGest = () => {
    post(12, 'gest (pomin)');
    czekaj(/Wybierz gest charakterystyczny/i, () => {
      send('pomin');
      krokSymbol();
    });
  };

  const krokSymbol = () => {
    post(13, 'symbol (pomin)');
    czekaj(/Wybierz symbol klubu/i, () => {
      send('pomin');
      krokPodsumowanie();
    });
  };

  const zbierzPodsumowanie = (tekst: string) => {
    const biezacy = ctx;
    if (!biezacy) return;
    for (const raw of tekst.split(/\r?\n/)) {
      const t = raw.trim();
      if (SUMMARY_NAME.test(t)) {
        biezacy.pendingNazwa = true;
      } else if (biezacy.pendingNazwa && t) {
        biezacy.wynik = t;
        biezacy.pendingNazwa = false;
      } else if (SUMMARY_LEADER.test(t)) {
        biezacy.pendingRola = 'przywodca';
      } else if (SUMMARY_DEPUTY.test(t)) {
        biezacy.pendingRola = 'zastepca';
      } else if (SUMMARY_MEMBER.test(t)) {
        biezacy.pendingRola = 'czlonek';
      } else if (biezacy.pendingRola && t) {
        biezacy.role[biezacy.pendingRola] = t;
        biezacy.pendingRola = null;
      }
    }
  };

  // The summary streams several lines at once — the name and the three titles as
  // "label:" / indented-value pairs — then the final confirmation. A transient
  // collector accumulates them; the confirmation one-shot ends the run.
  const krokPodsumowanie = () => {
    post(14, 'podsumowanie');
    ustawWatchdog('podsumowanie');
    api.triggers.register(
      /\S/,
      (line) => {
        try { zbierzPodsumowanie(line.text); } catch { /* never abort a game output batch */ }
        return line;
      },
      TAG_MENU,
    );

    czekaj(/Czy chcesz stworzyc taki klub/i, () => {
      send('**'); // cancel — never create
      zakoncz();
    });
  };

  const zakoncz = () => {
    const cur = ctx;
    if (!cur) return;
    const { typ, przymiotnik, rzeczownik, liczba, przypadek, wynik } = cur;
    if (wynik && typ && przymiotnik && rzeczownik && liczba && przypadek) {
      if (cur.odtwarzana && wynik.trim() !== cur.odtwarzana.trim()) {
        przerwij(`gra zwrocila "${wynik}", oczekiwano "${cur.odtwarzana}"; sprawdz skladniki i sprobuj ponownie`, false);
        return;
      }
      if ((cur.odtwarzana || cur.manual) && (!cur.role.przywodca || !cur.role.zastepca || !cur.role.czlonek)) {
        przerwij('nie udalo sie zebrac wszystkich tytulow wladz', false);
        return;
      }
      const role: Role = {
        przywodca: cur.role.przywodca ?? '',
        zastepca: cur.role.zastepca ?? '',
        czlonek: cur.role.czlonek ?? '',
      };
      const wpis: Omit<WpisLokalny, 'id' | 'kiedy' | 'wyslane'> = {
        typ,
        przymiotnik,
        rzeczownik,
        liczba,
        przypadek,
        wynik,
        charakter: cur.charakter ?? CHARAKTER,
        plec: cur.plec ?? PLEC,
        role,
        ...(cur.manual ? { tryb: 'manualny' as const } : {}),
      };
      const zapisany = baza.dodajWpis(wpis);
      if (cur.odtwarzana) baza.oznaczOdtworzony(cur.odtwarzana);
      sprzatnij();
      const header = new api.AnsiAwareBuffer('[rkg] ', styles.info);
      header.append('WYLOSOWANY KLUB', styles.action);
      api.output.print(header);
      printClubTable(api, styles, wynik, role);
      // The offer must not be able to take the run down with it.
      try {
        poZakonczeniu?.(zapisany);
      } catch {
        /* the club is already stored — rkghof can still publish it by hand */
      }
    } else {
      przerwij('nie udalo sie zebrac wszystkich danych', false);
    }
  };

  // ── Aliases ───────────────────────────────────────────────────────────────

  const startManual = () => {
    ctx = { manual: true, role: {}, pendingRola: null, pendingNazwa: false };
    const naPytanie = (gate: string | string[], re: RegExp, krok: string) => {
      registerTokenGate(api, gate, re, (line) => {
        if (ctx?.manual) manualPrompt = krok;
        return line;
      }, TAG_KREATOR);
    };
    naPytanie('charakter', /Jaki charakter ma miec klub/i, 'charakter');
    naPytanie('typu', /Jakiego typu ma to byc klub/i, 'typ');
    naPytanie('czlonkowie', /Jakiej plci maja byc czlonkowie/i, 'plec');
    naPytanie('nazwa', /Jaka ma byc nazwa klubu/i, 'nazwa');
    naPytanie('rzeczownik', /Podaj rzeczownik lub wyswietl/i, 'rzeczownik');
    naPytanie('przymiotnik', /Podaj przymiotnik/i, 'przymiotnik');
    naPytanie('liczbie', /w liczbie pojedynczej czy mnogiej/i, 'liczba');
    registerTokenGate(api, 'przypadku', /W jakim przypadku gramatycznym/i, (line) => {
      if (ctx?.manual) {
        manualPrompt = 'przypadek';
        if (!ctx.liczba) ctx.liczba = 'mnogiej';
      }
      return line;
    }, TAG_KREATOR);
    naPytanie('gest', /Wybierz gest charakterystyczny/i, 'gest');
    naPytanie('symbol', /Wybierz symbol klubu/i, 'symbol');
    registerTokenGate(api, 'pozwala', /pozwala na przyjmowanie wylacznie (mezczyzn|kobiet)/i, (line, m) => {
      if (ctx?.manual && m?.[1]) ctx.plec = m[1].toLowerCase() === 'kobiet' ? 'zenskiej' : 'meskiej';
      return line;
    }, TAG_KREATOR);
    registerTokenGate(api, 'stworzyc', /Czy chcesz stworzyc taki klub/i, (line) => {
      if (!ctx?.manual) return line;
      manualPrompt = null;
      try {
        manualFinalizing = true;
        send('**');
        zakoncz();
      } catch (e) {
        przerwij(`blad: ${String(e)}`, false);
      }
      return line;
    }, TAG_KREATOR);

    manualHookId = api.commandHooks.register((command: string) => {
      const cur = ctx;
      if (!cur?.manual) return undefined;
      if (manualFinalizing) return undefined;
      const answer = command.trim().toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/\u0142/g, 'l');
      if (answer === 'rkg-' || answer === 'rkg!' || answer === 'rkgman!') return undefined;
      if (answer === '**') {
        sprzatnij();
        drukuj('[rkg] przerwano recznie', styles.info);
        return undefined;
      }
      switch (manualPrompt) {
        case 'charakter':
          if (answer === 'jawny' || answer === 'niejawny') cur.charakter = answer;
          break;
        case 'typ':
          if (RKG_TYPY.includes(answer)) cur.typ = answer;
          break;
        case 'plec':
          if (['dowolnej', 'meskiej', 'zenskiej'].includes(answer)) cur.plec = answer;
          break;
        case 'nazwa':
          if (answer !== 'nazwa') {
            drukuj('[rkg] do zapisania w rankingu wybierz nazwa wlasna: nazwa', styles.info);
            return null;
          }
          break;
        case 'rzeczownik':
          if (/^[a-z]{2,24}(?: [a-z]{2,24})?$/.test(answer) && answer !== 'wyswietl') cur.rzeczownik = answer;
          break;
        case 'przymiotnik':
          if (/^[a-z]{3,32}$/.test(answer)) cur.przymiotnik = answer;
          break;
        case 'liczba':
          if (answer === 'pojedynczej' || answer === 'mnogiej') cur.liczba = answer;
          break;
        case 'przypadek':
          if (answer === 'mianowniku' || answer === 'dopelniaczu') cur.przypadek = answer;
          break;
        case 'symbol':
          if (!manualSummaryArmed) {
            manualSummaryArmed = true;
            api.triggers.register(/\S/, (line) => {
              try { zbierzPodsumowanie(line.text); } catch { /* keep output processing alive */ }
              return line;
            }, TAG_MENU);
          }
          break;
      }
      if (manualPrompt) drukuj(`[rkg] > ${answer}`, styles.info);
      return undefined;
    });
    drukuj('[rkg] tryb reczny: odpowiadaj sam na pytania gry; wybierz nazwa wlasna (nazwa). Na koncu zapisze podglad i anuluje zalozenie klubu.', styles.info);
    pokazOdpowiedzi();
    send('utworz klub');
  };

  api.aliases.register(/^rkgman!$/i, () => {
    if (ctx) drukuj('[rkg] juz trwa — rkg- aby przerwac', styles.info);
    else startManual();
    return true;
  });

  api.aliases.register(/^rkg!$/i, () => {
    if (ctx) {
      drukuj('[rkg] juz trwa — rkg- aby przerwac', styles.info);
      return true;
    }
    ctx = { role: {}, pendingRola: null, pendingNazwa: false };
    drukuj('[rkg] start (podglad — klub NIE zostanie zalozony)', styles.info);
    pokazOdpowiedzi();
    send('utworz klub');
    krokCharakter();
    return true;
  });

  api.aliases.register(/^rkg-$/i, () => {
    if (!ctx) {
      drukuj('[rkg] nic nie trwa', styles.info);
      return true;
    }
    przerwij('recznie', true);
    return true;
  });

  return {
    zatrzymaj: sprzatnij,
    odtworz: (nazwa, ziarno) => {
      if (ctx) {
        drukuj('[rkg] juz trwa — rkg- aby przerwac', styles.info);
        return;
      }
      if (!baza.stare.includes(nazwa)) {
        drukuj('[rkg] tej nazwy nie ma juz na liscie starych', styles.info);
        return;
      }
      if (!RKG_TYPY.includes(ziarno.typ) || !RKG_PRZYMIOTNIKI.includes(ziarno.przymiotnik)
        || !RZECZOWNIKI_SEED.includes(ziarno.rzeczownik)
        || !(LICZBY as readonly string[]).includes(ziarno.liczba)
        || !(PRZYPADKI as readonly string[]).includes(ziarno.przypadek)) {
        drukuj('[rkg] niepoprawne skladniki nazwy — popraw formularz', styles.info);
        return;
      }
      ctx = { odtwarzana: nazwa, ziarno, role: {}, pendingRola: null, pendingNazwa: false };
      drukuj(`[rkg] odtwarzam: ${nazwa} (podglad — klub NIE zostanie zalozony)`, styles.info);
      pokazOdpowiedzi();
      send('utworz klub');
      krokCharakter();
    },
  };
}
