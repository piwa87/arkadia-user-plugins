import type { FormatStateSnapshot, PluginApi } from '@arkadia/plugin-types';
import type { Liczba, Przypadek, Role, WpisLokalny } from '../../shared/rkg-api';
import { LICZBY, PRZYPADKI } from '../../shared/rkg-api';
import { getAnsiFormatState } from '../../lib/colors/my-ansi-colors';
import { withDelay } from '../../lib/withDelay';
import type { Baza } from './store';
import { RKG_PRZYMIOTNIKI } from './data/adjectives';
import { RKG_TYPY } from './data/types';
import { pick } from './generator';

/**
 * `rkg!` — drive the club-creation dialogue, harvesting every menu live, and
 * record the full generated club. PREVIEW ONLY: at the final "Czy chcesz
 * stworzyc taki klub?" prompt the runner sends `**` to cancel. It NEVER sends
 * `tak`; no club is ever founded.
 *
 * Why harvest instead of using the static lists: the option pools come from the
 * MUD and drift over time, and crucially the three leadership-title menus
 * (przywodca / zastepca / szeregowy czlonek) differ from one club type to the
 * next. So the type menu and the three title menus are read from the game's own
 * `* option` lines and chosen at random. The static lists survive only as a
 * fallback when a harvest comes back empty.
 *
 * The nouns are the exception: their pool barely changes, so rather than walk
 * the category sub-menus on every run (an extra round-trip that spams the game),
 * we keep a comprehensive static base in `data/seed.ts` and answer the noun
 * prompt directly with a random one. `rkgnazwy+ <slowo>` tops it up by hand.
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

// Used only if a title menu fails to harvest — the options seen in one real run.
// The game validates them, so a wrong-for-this-type fallback is simply rejected.
const FALLBACK_PRZYWODCA = ['pierwszy', 'przewodniczacy', 'przewodzacy', 'przywodca', 'starszy', 'zalozyciel'];
const FALLBACK_ZASTEPCA = ['drugi', 'starszy', 'wspolprzewodzacy', 'wspolzalozyciel', 'zaufany'];
const FALLBACK_CZLONEK = ['brat', 'czlonek', 'jeden', 'nalezacy', 'uczestnik'];

const CHARAKTER = 'jawny';
const PLEC = 'dowolnej';

interface Ctx {
  typ?: string;
  przymiotnik?: string;
  rzeczownik?: string;
  liczba?: Liczba;
  przypadek?: Przypadek;
  wynik?: string;
  role: Partial<Role>;
  pendingRola: keyof Role | null;
  pendingNazwa: boolean;
}

export function setupKreator(api: PluginApi, baza: Baza): () => void {
  const kolorInfo = getAnsiFormatState(3, api);
  const kolorNazwy = getAnsiFormatState(110, api);
  const kolorRoli = getAnsiFormatState(11, api);

  let ctx: Ctx | null = null;
  let watchdog: ReturnType<typeof setTimeout> | null = null;

  const drukuj = (tekst: string, kolor: FormatStateSnapshot) => {
    const buf = new api.AnsiAwareBuffer(tekst);
    buf.color([0, tekst.length], kolor);
    api.output.print(buf);
  };
  const send = (tekst: string) => api.command.send(tekst, false);
  const post = (i: number, id: string) => drukuj(`[rkg] ${i} ${id}`, kolorInfo);

  const czyscWatchdog = () => {
    if (watchdog !== null) {
      clearTimeout(watchdog);
      watchdog = null;
    }
  };

  const sprzatnij = () => {
    czyscWatchdog();
    api.triggers.removeByTag(TAG_KREATOR);
    api.triggers.removeByTag(TAG_MENU);
    ctx = null;
  };

  const przerwij = (powod: string, wyslijAbort: boolean) => {
    if (!ctx) return;
    if (wyslijAbort) send('**');
    sprzatnij();
    drukuj(`[rkg] przerwano: ${powod}`, kolorInfo);
  };

  const ustawWatchdog = (gdzie: string) => {
    czyscWatchdog();
    watchdog = setTimeout(() => przerwij(`brak odpowiedzi gry (${gdzie})`, false), WATCHDOG_MS);
  };

  /**
   * Wait for `re`, then after a randomized delay run `fn`. Guards against the
   * run being aborted or restarted while the delay is pending. Keeps the
   * trigger body trivial — real work is always on the timer, never inline, so a
   * throw can never escape into the client's output loop.
   */
  /**
   * Wait for whichever of several prompts arrives first, run its handler, and
   * drop the losing one-shots. The dialogue branches once: a plurale tantum noun
   * ('wrota', 'drzwi', 'nozyce', ...) makes the game skip the liczba question and
   * jump straight to przypadek.
   */
  const czekajNaJedno = (warianty: { re: RegExp; fn: (m: RegExpMatchArray) => void }[]) => {
    ustawWatchdog(warianty.map((w) => w.re.source).join(' / '));
    const biezacy = ctx;
    for (const { re, fn } of warianty) {
      api.triggers.registerOneTime(
        re,
        (line, matches) => {
          if (!ctx || ctx !== biezacy) return line;
          czyscWatchdog();
          api.triggers.removeByTag(TAG_KREATOR); // drop the sibling prompt(s)
          withDelay(GAP_MIN, GAP_MAX, () => {
            if (ctx !== biezacy) return;
            try {
              fn(matches);
            } catch (e) {
              przerwij(`blad: ${String(e)}`, true);
            }
          });
          return line;
        },
        TAG_KREATOR,
      );
    }
  };

  const czekaj = (re: RegExp, fn: (m: RegExpMatchArray) => void) => czekajNaJedno([{ re, fn }]);

  /** A `* option` menu: collect the bullets that follow the prompt, pick one. */
  const menuKrok = (re: RegExp, fallback: readonly string[], uzyj: (wybor: string) => void) => {
    const bufor: string[] = [];
    api.triggers.register(
      /^\s+\*\s+(.+)$/,
      (line, m) => {
        if (m && m[1]) bufor.push(m[1].trim());
        return line;
      },
      TAG_MENU,
    );
    czekaj(re, () => {
      api.triggers.removeByTag(TAG_MENU);
      const opcje = bufor.length > 0 ? bufor : [...fallback];
      uzyj(pick(opcje));
    });
  };

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
    // Hardcoded: the type list is stable, so we answer from RKG_TYPY directly
    // rather than harvesting the menu.
    czekaj(/Jakiego typu ma to byc klub/i, () => {
      const typ = pick(RKG_TYPY);
      ctx!.typ = typ;
      send(typ);
      krokPlec();
    });
  };

  const krokPlec = () => {
    post(3, 'plec');
    czekaj(/Jakiej plci maja byc czlonkowie/i, () => {
      send(PLEC);
      krokNazwa();
    });
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
    czekaj(/Podaj rzeczownik lub wyswietl/i, () => {
      const noun = baza.rzeczowniki.length > 0 ? pick(baza.rzeczowniki) : 'miecz';
      ctx!.rzeczownik = noun;
      send(noun);
      krokPrzymiotnik();
    });
  };

  const krokPrzymiotnik = () => {
    post(6, 'przymiotnik');
    czekaj(/Podaj przymiotnik/i, () => {
      const adj = pick(RKG_PRZYMIOTNIKI);
      ctx!.przymiotnik = adj;
      send(adj);
      krokLiczbaLubPrzypadek();
    });
  };

  const wyslijPrzypadek = () => {
    const p = pick(PRZYPADKI) as Przypadek;
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
          const l = pick(LICZBY) as Liczba;
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
    menuKrok(/Wybierz tytul dla przywodcy/i, FALLBACK_PRZYWODCA, (t) => {
      send(t);
      krokZastepca();
    });
  };

  const krokZastepca = () => {
    post(10, 'tytul zastepcy');
    menuKrok(/Wybierz tytul dla zastepcy przywodcy/i, FALLBACK_ZASTEPCA, (t) => {
      send(t);
      krokSzeregowy();
    });
  };

  const krokSzeregowy = () => {
    post(11, 'tytul czlonka');
    menuKrok(/Wybierz tytul dla szeregowego czlonka/i, FALLBACK_CZLONEK, (t) => {
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

  // The summary streams several lines at once — the name and the three titles as
  // "label:" / indented-value pairs — then the final confirmation. A transient
  // collector accumulates them; the confirmation one-shot ends the run.
  const krokPodsumowanie = () => {
    post(14, 'podsumowanie');
    ustawWatchdog('podsumowanie');
    api.triggers.register(
      /\S/,
      (line) => {
        const biezacy = ctx;
        if (!biezacy) return line;
        const t = line.text.trim();
        if (/^Podsumowujac, nowy klub bedzie sie nazywal:/i.test(t)) {
          biezacy.pendingNazwa = true;
        } else if (biezacy.pendingNazwa && t) {
          biezacy.wynik = t;
          biezacy.pendingNazwa = false;
        } else if (/^Przywodca bedzie nosil tytul:/i.test(t)) {
          biezacy.pendingRola = 'przywodca';
        } else if (/^Zastepca przywodcy bedzie nosil tytul:/i.test(t)) {
          biezacy.pendingRola = 'zastepca';
        } else if (/^Szeregowy czlonek klubu bedzie nosil tytul:/i.test(t)) {
          biezacy.pendingRola = 'czlonek';
        } else if (biezacy.pendingRola && t) {
          biezacy.role[biezacy.pendingRola] = t;
          biezacy.pendingRola = null;
        }
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
        charakter: CHARAKTER,
        plec: PLEC,
        role,
      };
      baza.dodajWpis(wpis);
      sprzatnij();
      drukuj(`[rkg] ${wynik}`, kolorNazwy);
      if (role.przywodca) drukuj(`      przywodca: ${role.przywodca}`, kolorRoli);
      if (role.zastepca) drukuj(`      zastepca:  ${role.zastepca}`, kolorRoli);
      if (role.czlonek) drukuj(`      czlonek:   ${role.czlonek}`, kolorRoli);
    } else {
      przerwij('nie udalo sie zebrac wszystkich danych', false);
    }
  };

  // ── Aliases ───────────────────────────────────────────────────────────────

  api.aliases.register(/^rkg!$/i, () => {
    if (ctx) {
      drukuj('[rkg] juz trwa — rkg- aby przerwac', kolorInfo);
      return true;
    }
    ctx = { role: {}, pendingRola: null, pendingNazwa: false };
    drukuj('[rkg] start (podglad — klub NIE zostanie zalozony)', kolorInfo);
    send('utworz klub');
    krokCharakter();
    return true;
  });

  api.aliases.register(/^rkg-$/i, () => {
    if (!ctx) {
      drukuj('[rkg] nic nie trwa', kolorInfo);
      return true;
    }
    przerwij('recznie', true);
    return true;
  });

  return sprzatnij;
}
