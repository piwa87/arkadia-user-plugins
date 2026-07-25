import type { PluginApi } from '@arkadia/plugin-types';
import type {
  CzystkaResponse,
  GlosResponse,
  ListaResponse,
  Pozycja,
  WpisLokalny,
  ZgloszenieRequest,
  ZgloszenieResponse,
} from '../../shared/rkg-api';
import { WZORZEC_NICKA } from '../../shared/rkg-grammar';
import { storage } from '../../lib/storage';
import { getAnsiFormatState } from '../../lib/colors/my-ansi-colors';
import { getCharName } from '../../lib/getCharName';
import type { Baza } from './store';

/**
 * The RKG window and the publishing flow — share generated clubs to the public
 * ranking and browse it.
 *
 * Two front-ends, deliberately: the end-of-run offer is a few clickable lines of
 * game output (`zaproponuj`), because publishing is a one-shot yes/no and a
 * window for it is heavier than the decision; the popup is for browsing
 * "Lokalne"/"Top", where a window earns its keep.
 *
 * The wall API is a different origin than the game client, so every call goes
 * through `zapytaj`, which never throws and never blocks: it times out, and any
 * failure returns `{ ok: false }` so the caller can show a message. `rkg!`,
 * `rkgshow!` and the "Lokalne" tab all keep working with the wall down.
 */

const WALL = 'https://rkg.piwa87.workers.dev';
const KL_GLOSUJACY = 'rkg:glosujacy';
const KL_NICK = 'rkg:nick';
const KL_ANONIM = 'rkg:anonim';
const KL_ZGODA = 'rkg:zgoda';
const TIMEOUT_MS = 8000;
/** How long the first-upload nick prompt stays in front of your input. */
const PYTANIE_MS = 60_000;

function glosujacy(): string {
  let id = storage.get<string>(KL_GLOSUJACY);
  if (!id) {
    id = crypto.randomUUID();
    storage.set(KL_GLOSUJACY, id);
  }
  return id;
}

type Odp<T> = { ok: true; dane: T } | { ok: false; blad: string };

export interface Hof {
  /** Offer to publish a just-generated club as a clickable line of output. */
  zaproponuj(w: WpisLokalny): void;
  zatrzymaj(): void;
}

export function setupHof(api: PluginApi, baza: Baza): Hof {
  const aktywne = new Set<AbortController>();
  const wTrakcie = new Set<string>();
  let popup: Awaited<ReturnType<PluginApi['ui']['registerPersistentPopup']>> | null = null;
  let zakladka: 'lokalne' | 'top' = 'lokalne';
  let pytanieHook: string | null = null;
  let pytanieTimer: ReturnType<typeof setTimeout> | null = null;

  // Built once, never inside a callback.
  const kolorInfo = getAnsiFormatState(3, api);
  const kolorAkcja = getAnsiFormatState(14, api);

  const info = (t: string) => api.output.print(`[rkg] ${t}`);

  async function zapytaj<T>(sciezka: string, init?: RequestInit): Promise<Odp<T>> {
    const ctrl = new AbortController();
    aktywne.add(ctrl);
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(WALL + sciezka, { ...init, signal: ctrl.signal });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, blad: (data && data.blad) || `HTTP ${res.status}` };
      return { ok: true, dane: data as T };
    } catch {
      return { ok: false, blad: 'wall niedostepny' };
    } finally {
      clearTimeout(timer);
      aktywne.delete(ctrl);
    }
  }

  // ── DOM helpers ────────────────────────────────────────────────────────────

  const el = (tag: string, klasa = '', tekst?: string): HTMLElement => {
    const n = document.createElement(tag);
    if (klasa) n.className = klasa;
    if (tekst != null) n.textContent = tekst;
    return n;
  };

  const przerysuj = () => {
    if (popup) popup.setBody(build());
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function wyslij(w: WpisLokalny, nick?: string | null): Promise<void> {
    // `undefined` = whatever is saved; `null` = deliberately anonymous.
    const podpis = nick === undefined ? storage.get<string>(KL_NICK) : nick;
    if (wTrakcie.has(w.id)) return;
    wTrakcie.add(w.id);
    const payload: ZgloszenieRequest = {
      typ: w.typ,
      przymiotnik: w.przymiotnik,
      rzeczownik: w.rzeczownik,
      liczba: w.liczba,
      przypadek: w.przypadek,
      wynik: w.wynik,
      role: w.role,
      nick: podpis || undefined,
      glosujacy: glosujacy(),
    };
    try {
      const odp = await zapytaj<ZgloszenieResponse>('/api/nazwy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (odp.ok) {
        baza.oznaczWyslany(w.id, odp.dane.id);
        const jako = podpis ? ` jako ${podpis}` : ' anonimowo';
        info(odp.dane.duplikat ? `juz bylo: ${w.wynik}` : `wyslano${jako}: ${w.wynik}`);
      } else {
        info(`nie wyslano (${odp.blad})`);
      }
    } finally {
      wTrakcie.delete(w.id);
    }
    przerysuj();
  }

  function poWyslij(w: WpisLokalny): void {
    zPodpisem(w, (nick) => void wyslij(w, nick));
  }

  /**
   * The character's own name from GMCP, title-cased, or null before GMCP has
   * reported it (or if it is not a legal nick).
   */
  function imiePostaci(): string | null {
    const imie = getCharName(api); // lowercased, '' until GMCP reports it
    if (!imie) return null;
    const kandydat = imie.charAt(0).toUpperCase() + imie.slice(1);
    return WZORZEC_NICKA.test(kandydat) ? kandydat : null;
  }

  /** What the send action is labelled with: saved nick, else character name. */
  function domyslnyNick(): string | null {
    return storage.get<string>(KL_NICK) ?? imiePostaci();
  }

  /**
   * Resolve the signature, then run `dalej` with it (null = anonymous).
   *
   * The nick is settled exactly once, at the first upload: until then there is
   * nothing to ask about, and after it the saved answer is reused silently.
   * The prompt reads the NEXT line you type — empty (just Enter) takes the
   * character name, `-` means anonymous. Anything that is not a plausible nick
   * is handed back to the game untouched and the upload is dropped, so a
   * reflexive movement command costs nothing but the send.
   */
  function zPodpisem(w: WpisLokalny, dalej: (nick: string | null) => void): void {
    if (w.wyslane) {
      info(`juz wyslane: ${w.wynik}`);
      return;
    }
    const zapisany = storage.get<string>(KL_NICK);
    if (zapisany) return dalej(zapisany);
    if (storage.get<boolean>(KL_ANONIM)) return dalej(null);

    ujawnij();
    const imie = imiePostaci();
    info(
      imie
        ? `Podaj nick pod ktorym publikowac (Enter = ${imie}, '-' = anonimowo):`
        : "Podaj nick pod ktorym publikowac ('-' = anonimowo):",
    );
    zapytajONick(imie, (nick, anonim) => {
      if (nick) storage.set(KL_NICK, nick);
      if (anonim) storage.set(KL_ANONIM, true);
      dalej(nick);
    });
  }

  /**
   * Arm a one-shot command hook for the answer. Registered only while a prompt
   * is outstanding, and dropped on answer, timeout or plugin unload — it must
   * never sit between the user and the game any longer than that.
   */
  function zapytajONick(
    imie: string | null,
    gotowe: (nick: string | null, anonim: boolean) => void,
  ): void {
    anulujPytanie();
    const zakoncz = () => {
      anulujPytanie();
    };
    pytanieHook = api.commandHooks.register((cmd: string) => {
      const tekst = (cmd ?? '').trim();
      if (tekst === '') {
        zakoncz();
        if (imie) gotowe(imie, false);
        else {
          info('nie wyslano — brak nicka i brak imienia z GMCP');
        }
        return null; // swallow the bare Enter
      }
      if (tekst === '-') {
        zakoncz();
        gotowe(null, true);
        return null;
      }
      if (WZORZEC_NICKA.test(tekst)) {
        zakoncz();
        gotowe(tekst, false);
        return null;
      }
      // Not a nick — let the game have it and forget the whole thing.
      zakoncz();
      info('to nie wyglada na nick — nie wyslano. Sprobuj: rkgwyslij <nick>');
      return undefined;
    }, 100);
    pytanieTimer = setTimeout(() => {
      anulujPytanie();
      info('minal czas na nick — nie wyslano. Sprobuj: rkgwyslij <nick>');
    }, PYTANIE_MS);
  }

  function anulujPytanie(): void {
    if (pytanieHook) {
      api.commandHooks.unregister(pytanieHook);
      pytanieHook = null;
    }
    if (pytanieTimer !== null) {
      clearTimeout(pytanieTimer);
      pytanieTimer = null;
    }
  }

  /** Printed once, before the first send, so the choice is an informed one. */
  function ujawnij(): void {
    if (storage.get<boolean>(KL_ZGODA)) return;
    storage.set(KL_ZGODA, true);
    const t = '[rkg] Do rankingu ida: nazwa klubu, tytuly wladz i nick. Nic wiecej.';
    const buf = new api.AnsiAwareBuffer(t);
    buf.color([0, t.length], kolorInfo);
    api.output.print(buf);
  }

  /**
   * The end-of-run offer: the options as clickable lines of output. No window —
   * publishing is a yes/no, and the browse window is one click away for the rest.
   *
   * Never throws: it runs from the dialogue runner's timer, where an exception
   * would abort the run. If the client cannot render links it degrades to a hint.
   */
  function zaproponuj(w: WpisLokalny): void {
    try {
      const nick = domyslnyNick();
      info('Opcje:');
      opcja(
        nick ? `wyslij do rankingu (jako ${nick})` : 'wyslij do rankingu',
        'Opublikuj ten klub na wspolnej scianie',
        () => poWyslij(w),
      );
      opcja('nie wysylaj', 'Zostaw tylko lokalnie', () =>
        info('ok — pozniej: rkgwyslij albo rkghof'),
      );
      opcja('otworz okno lokalnych', 'Pokaz zebrane kluby', () => {
        zakladka = 'lokalne';
        void otworz();
      });
      linkDoRankingu();
    } catch {
      info('rkghof — okno z lista klubow, aby wyslac klub do rankingu');
    }
  }

  /** One clickable option on its own line. */
  function opcja(tekst: string, tytul: string, fn: () => void): void {
    const buf = new api.AnsiAwareBuffer('        ', kolorInfo);
    akcja(buf, tekst, tytul, fn);
    api.output.print(buf);
  }

  function linkDoRankingu(): void {
    const buf = new api.AnsiAwareBuffer('      Link do rankingu: ', kolorInfo);
    akcja(buf, WALL, 'Otworz ranking w przegladarce', () => {
      window.open(WALL, '_blank', 'noopener');
    });
    api.output.print(buf);
  }

  /** Append a clickable, underlined action to a line of output. */
  function akcja(
    buf: InstanceType<PluginApi['AnsiAwareBuffer']>,
    tekst: string,
    tytul: string,
    fn: () => void,
  ): void {
    buf.append(tekst, {
      ...kolorAkcja,
      underline: true,
      // A click handler must never throw into the client's event loop.
      hyperlink: {
        title: tytul,
        onClick: () => {
          try {
            fn();
          } catch {
            /* ignore */
          }
        },
      },
    });
  }

  async function glosuj(id: string, wartosc: 1 | -1): Promise<void> {
    const odp = await zapytaj<GlosResponse>(`/api/nazwy/${id}/glos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ glosujacy: glosujacy(), wartosc }),
    });
    if (!odp.ok) info(`glos nie przeszedl (${odp.blad})`);
    // Refresh the Top tab so the score reflects the server.
    if (zakladka === 'top') await zaladujTop();
    else przerysuj();
  }

  // ── Views ────────────────────────────────────────────────────────────────────

  let topPozycje: Pozycja[] | null = null;
  let topBlad = '';

  async function zaladujTop(): Promise<void> {
    const odp = await zapytaj<ListaResponse>('/api/nazwy?sort=top&limit=25');
    if (odp.ok) {
      topPozycje = odp.dane.pozycje;
      topBlad = '';
    } else {
      topBlad = odp.blad;
    }
    przerysuj();
  }

  function widokLokalne(): HTMLElement {
    const kolumna = el('div', 'rkg-kolumna');
    const lista = el('div', 'rkg-lista');

    if (baza.wpisy.length === 0) {
      lista.append(el('p', 'rkg-pusto', 'Brak zebranych klubow. Uzyj rkg! w grze.'));
      kolumna.append(lista);
      return kolumna;
    }

    for (const w of [...baza.wpisy].reverse()) {
      const wiersz = el('div', 'rkg-wpis');
      const tresc = el('div', 'rkg-tresc');
      tresc.append(el('div', 'rkg-nazwa', w.wynik));
      if (w.role?.przywodca) tresc.append(el('div', 'rkg-rola', `👑 ${w.role.przywodca}`));
      wiersz.append(tresc);

      const btn = el('button', 'rkg-btn', w.wyslane ? '✓ w rankingu' : 'Wyslij') as HTMLButtonElement;
      btn.disabled = !!w.wyslane;
      if (!w.wyslane) btn.onclick = () => poWyslij(w);
      wiersz.append(btn);

      // Published clubs have no delete button: dropping one locally would only
      // lose our record of what is already public.
      if (!w.wyslane) {
        const usun = el('button', 'rkg-usun', '✕') as HTMLButtonElement;
        usun.title = 'Usun z lokalnych';
        usun.onclick = () => {
          baza.usun(w.id);
          przerysuj();
        };
        wiersz.append(usun);
      }
      lista.append(wiersz);
    }
    kolumna.append(lista);

    const niewyslane = baza.wpisy.filter((w) => !w.wyslane).length;
    if (niewyslane > 0) {
      const stopka = el('div', 'rkg-stopka');
      const czysc = el(
        'button',
        'rkg-btn',
        `Usun niewyslane (${niewyslane})`,
      ) as HTMLButtonElement;
      czysc.title = 'Kluby juz wyslane do rankingu zostaja';
      czysc.onclick = () => {
        const ile = baza.usunNiewyslane();
        info(`usunieto lokalnie: ${ile}`);
        przerysuj();
      };
      stopka.append(czysc);
      kolumna.append(stopka);
    }
    return kolumna;
  }

  function widokTop(): HTMLElement {
    const lista = el('div', 'rkg-lista');
    if (topPozycje === null) {
      lista.append(el('p', 'rkg-pusto', 'Ladowanie…'));
      void zaladujTop();
      return lista;
    }
    if (topBlad) {
      lista.append(el('p', 'rkg-pusto', `Wall niedostepny (${topBlad}).`));
      return lista;
    }
    if (topPozycje.length === 0) {
      lista.append(el('p', 'rkg-pusto', 'Jeszcze pusto — wyslij pierwszy klub!'));
      return lista;
    }
    topPozycje.forEach((p, i) => {
      const wiersz = el('div', 'rkg-wpis');
      const glosy = el('div', 'rkg-glosy');
      const up = el('button', 'rkg-strzalka', '▲') as HTMLButtonElement;
      up.onclick = () => glosuj(p.id, 1);
      const down = el('button', 'rkg-strzalka', '▼') as HTMLButtonElement;
      down.onclick = () => glosuj(p.id, -1);
      glosy.append(up, el('span', 'rkg-wynik', String(p.wynikGlosow)), down);
      const tresc = el('div', 'rkg-tresc');
      tresc.append(el('div', 'rkg-nazwa', `#${i + 1} ${p.wynik}`));
      if (p.nick) tresc.append(el('div', 'rkg-rola', `od ${p.nick}`));
      wiersz.append(glosy, tresc);
      lista.append(wiersz);
    });
    return lista;
  }

  function build(): HTMLElement {
    const root = el('div', 'rkg-hof');
    root.append(el('style', '', STYLE));

    const tabs = el('div', 'rkg-tabs');
    const mk = (id: 'lokalne' | 'top', label: string) => {
      const b = el('button', `rkg-tab${zakladka === id ? ' akt' : ''}`, label) as HTMLButtonElement;
      b.onclick = () => {
        zakladka = id;
        przerysuj();
      };
      return b;
    };
    tabs.append(mk('lokalne', 'Lokalne'), mk('top', 'Top (ranking)'));
    root.append(tabs);

    root.append(zakladka === 'lokalne' ? widokLokalne() : widokTop());
    return root;
  }

  // ── Open / aliases ───────────────────────────────────────────────────────────

  async function otworz(): Promise<void> {
    if (!popup) {
      popup = await api.ui.registerPersistentPopup({
        id: 'rkg-hof',
        title: 'RKG',
        createContent: build,
      });
    }
    if (!popup.isOpen) await popup.open();
    else przerysuj();
  }

  api.ui.addPopupMenuEntry('RKG', () => void otworz());
  api.aliases.register(/^rkghof$/i, () => {
    void otworz();
    return true;
  });

  api.aliases.register(/^rkgnick(?:\s+(.+))?$/i, (m) => {
    const arg = m?.[1]?.trim();
    if (!arg) {
      const nick = storage.get<string>(KL_NICK);
      info(nick ? `nick: ${nick}` : 'nick: (brak, anonimowo). Ustaw: rkgnick <nazwa>');
      return true;
    }
    if (arg === '-') {
      storage.remove(KL_NICK);
      storage.set(KL_ANONIM, true);
      info('nick usuniety — publikujesz anonimowo');
      return true;
    }
    if (!WZORZEC_NICKA.test(arg)) {
      info('nick: 2-16 znakow A-Z, 0-9, _ lub -');
      return true;
    }
    storage.set(KL_NICK, arg);
    storage.remove(KL_ANONIM);
    info(`nick ustawiony: ${arg}`);
    return true;
  });

  // ── rkgwyslij — the keyboard path to the same thing the links do ───────────
  api.aliases.register(/^rkgwyslij(?:\s+(.+))?$/i, (m) => {
    const arg = m?.[1]?.trim();
    const w = [...baza.wpisy].reverse().find((x) => !x.wyslane);
    if (!w) {
      info('nie ma czego wyslac — uzyj rkg!');
      return true;
    }
    // No argument goes through the normal path — which asks for a nick if this
    // is the first upload. An explicit argument answers that question itself.
    if (!arg) {
      poWyslij(w);
      return true;
    }
    if (arg === '-') {
      ujawnij();
      storage.set(KL_ANONIM, true);
      void wyslij(w, null);
      return true;
    }
    if (!WZORZEC_NICKA.test(arg)) {
      info('nick: 2-16 znakow A-Z, 0-9, _ lub -');
      return true;
    }
    ujawnij();
    storage.set(KL_NICK, arg);
    storage.remove(KL_ANONIM);
    void wyslij(w, arg);
    return true;
  });

  // ── rkgnuke — beta wipe ────────────────────────────────────────────────────
  // Clears the public wall AND the local list, in that order: if the server call
  // fails there is nothing to be out of sync with. The key is never stored — it
  // is typed each time, so a published plugin file gives nobody the ability.
  api.aliases.register(/^rkgnuke(?:\s+(.+))?$/i, (m) => {
    const klucz = m?.[1]?.trim();
    if (!klucz) {
      info('uzycie: rkgnuke <klucz> — kasuje CALY ranking i lokalna liste, bez cofniecia');
      info('       rkgnuke - — kasuje tylko lokalna liste (rkg:wpisy), sciany nie rusza');
      return true;
    }
    if (klucz === '-') {
      const ile = baza.wyczysc();
      info(`lokalna lista wyczyszczona (${ile}) — ranking bez zmian`);
      przerysuj();
      return true;
    }
    void (async () => {
      const odp = await zapytaj<CzystkaResponse>('/api/nazwy', {
        method: 'DELETE',
        headers: { 'X-RKG-Admin': klucz },
      });
      if (!odp.ok) {
        info(`nie wyczyszczono (${odp.blad})`);
        return;
      }
      const lokalne = baza.wyczysc();
      topPozycje = null; // force the Top tab to refetch rather than show ghosts
      info(
        `ranking wyczyszczony: ${odp.dane.nazwy} nazw, ${odp.dane.glosy} glosow` +
          ` (lokalnie: ${lokalne})`,
      );
      przerysuj();
    })();
    return true;
  });

  return {
    zaproponuj,
    zatrzymaj: () => {
      anulujPytanie(); // a pending nick prompt must not outlive the plugin
      for (const c of aktywne) c.abort();
      aktywne.clear();
      popup?.close();
      popup = null;
    },
  };
}

const STYLE = `
/* The popup body supplies neither padding nor a layout of its own: without this
   the content sits flush in the corner, and the list leaves the rest of the
   window empty. The root claims the full height and the list is the part that
   grows and scrolls — tabs stay pinned at the top, the footer at the bottom. */
.rkg-hof { min-width: 280px; padding: 14px 16px 16px; box-sizing: border-box; display: flex; flex-direction: column; height: 100%; min-height: 260px; font: 13px/1.45 system-ui, sans-serif; }
.rkg-tabs { display: flex; gap: 6px; margin-bottom: 10px; flex: 0 0 auto; }
.rkg-tab { border: 1px solid #8884; background: transparent; color: inherit; padding: 5px 14px; border-radius: 999px; cursor: pointer; }
.rkg-tab.akt { background: #f0b42933; border-color: #f0b429; font-weight: 600; }
.rkg-kolumna { flex: 1 1 auto; display: flex; flex-direction: column; min-height: 0; }
/* min-height:0 is what actually lets a flex child scroll instead of stretching. */
.rkg-lista { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
.rkg-stopka { flex: 0 0 auto; display: flex; justify-content: flex-end; padding-top: 10px; margin-top: 10px; border-top: 1px solid #8883; }
.rkg-usun { border: none; background: none; color: inherit; opacity: .45; cursor: pointer; font-size: 1.05em; line-height: 1; padding: 4px 2px; }
.rkg-usun:hover { opacity: 1; color: #e2777a; }
.rkg-wpis { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid #8883; border-radius: 10px; }
.rkg-tresc { flex: 1; min-width: 0; }
.rkg-nazwa { font-weight: 600; }
.rkg-rola { color: #8a8; opacity: .8; font-size: .85em; margin-top: 2px; }
.rkg-glosy { display: flex; flex-direction: column; align-items: center; }
.rkg-strzalka { border: none; background: none; color: inherit; cursor: pointer; opacity: .6; font-size: 1em; }
.rkg-strzalka:hover { opacity: 1; }
.rkg-wynik { font-weight: 700; font-variant-numeric: tabular-nums; }
.rkg-btn { border: 1px solid #8884; background: transparent; color: inherit; padding: 5px 12px; border-radius: 8px; cursor: pointer; }
.rkg-btn:disabled { opacity: .5; cursor: default; }
.rkg-primary { background: #f0b42933; border-color: #f0b429; }
.rkg-rzad { display: flex; gap: 8px; margin-top: 12px; }
.rkg-pusto { text-align: center; opacity: .6; padding: 24px 0; }
.rkg-zgoda { max-width: 360px; }
.rkg-maly { opacity: .7; font-size: .9em; }
`;
