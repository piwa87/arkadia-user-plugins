import type { PluginApi } from '@arkadia/plugin-types';
import type {
  GlosResponse,
  ListaResponse,
  Pozycja,
  WpisLokalny,
  ZgloszenieRequest,
  ZgloszenieResponse,
} from '../../shared/rkg-api';
import { WZORZEC_NICKA } from '../../shared/rkg-grammar';
import { storage } from '../../lib/storage';
import type { Baza } from './store';

/**
 * "Sala Chwaly" — share generated clubs to the public wall and browse the top
 * ones, from a popup inside the client.
 *
 * The wall API is a different origin than the game client, so every call goes
 * through `zapytaj`, which never throws and never blocks: it times out, and any
 * failure returns `{ ok: false }` so the popup can show a message. `rkg!`,
 * `rkgshow!` and the "Moje" tab all keep working with the wall down.
 */

const DOMYSLNY_WALL = 'https://rkg.piwa87.workers.dev';
const KL_WALL = 'rkg:wall';
const KL_GLOSUJACY = 'rkg:glosujacy';
const KL_NICK = 'rkg:nick';
const KL_ZGODA = 'rkg:zgoda';
const TIMEOUT_MS = 8000;

function wallBase(): string {
  return (storage.get<string>(KL_WALL) ?? DOMYSLNY_WALL).replace(/\/+$/, '');
}

function glosujacy(): string {
  let id = storage.get<string>(KL_GLOSUJACY);
  if (!id) {
    id = crypto.randomUUID();
    storage.set(KL_GLOSUJACY, id);
  }
  return id;
}

type Odp<T> = { ok: true; dane: T } | { ok: false; blad: string };

export function setupHof(api: PluginApi, baza: Baza): () => void {
  const aktywne = new Set<AbortController>();
  let popup: Awaited<ReturnType<PluginApi['ui']['registerPersistentPopup']>> | null = null;
  let zakladka: 'moje' | 'top' = 'moje';

  const info = (t: string) => api.output.print(`[rkg] ${t}`);

  async function zapytaj<T>(sciezka: string, init?: RequestInit): Promise<Odp<T>> {
    const ctrl = new AbortController();
    aktywne.add(ctrl);
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(wallBase() + sciezka, { ...init, signal: ctrl.signal });
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

  async function wyslij(w: WpisLokalny): Promise<void> {
    const payload: ZgloszenieRequest = {
      typ: w.typ,
      przymiotnik: w.przymiotnik,
      rzeczownik: w.rzeczownik,
      liczba: w.liczba,
      przypadek: w.przypadek,
      wynik: w.wynik,
      role: w.role,
      nick: storage.get<string>(KL_NICK) || undefined,
      glosujacy: glosujacy(),
    };
    const odp = await zapytaj<ZgloszenieResponse>('/api/nazwy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (odp.ok) {
      baza.oznaczWyslany(w.id, odp.dane.id);
      info(odp.dane.duplikat ? `juz bylo: ${w.wynik}` : `wyslano: ${w.wynik}`);
    } else {
      info(`nie wyslano (${odp.blad})`);
    }
    przerysuj();
  }

  function poWyslij(w: WpisLokalny): void {
    if (storage.get<boolean>(KL_ZGODA)) {
      void wyslij(w);
    } else {
      pokazZgode(w);
    }
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

  function pokazZgode(w: WpisLokalny): void {
    if (!popup) return;
    const box = el('div', 'rkg-zgoda');
    box.append(
      el('p', '', 'Wyslac na publiczna sciane?'),
      el(
        'p',
        'rkg-maly',
        'Wysylane sa: nazwa klubu, tytuly wladz oraz (jesli ustawiony) Twoj nick. Nic wiecej.',
      ),
    );
    const tak = el('button', 'rkg-btn rkg-primary', 'Wyslij i zapamietaj zgode') as HTMLButtonElement;
    tak.onclick = () => {
      storage.set(KL_ZGODA, true);
      void wyslij(w);
    };
    const nie = el('button', 'rkg-btn', 'Anuluj') as HTMLButtonElement;
    nie.onclick = () => przerysuj();
    const rzad = el('div', 'rkg-rzad');
    rzad.append(tak, nie);
    box.append(rzad);
    popup.setBody(box);
  }

  function widokMoje(): HTMLElement {
    const lista = el('div', 'rkg-lista');
    if (baza.wpisy.length === 0) {
      lista.append(el('p', 'rkg-pusto', 'Brak zebranych klubow. Uzyj rkg! w grze.'));
      return lista;
    }
    for (const w of [...baza.wpisy].reverse()) {
      const wiersz = el('div', 'rkg-wpis');
      const tresc = el('div', 'rkg-tresc');
      tresc.append(el('div', 'rkg-nazwa', w.wynik));
      if (w.role?.przywodca) tresc.append(el('div', 'rkg-rola', `👑 ${w.role.przywodca}`));
      wiersz.append(tresc);

      const btn = el('button', 'rkg-btn', w.wyslane ? '✓ wyslano' : 'Wyslij') as HTMLButtonElement;
      btn.disabled = !!w.wyslane;
      if (!w.wyslane) btn.onclick = () => poWyslij(w);
      wiersz.append(btn);
      lista.append(wiersz);
    }
    return lista;
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
    const mk = (id: 'moje' | 'top', label: string) => {
      const b = el('button', `rkg-tab${zakladka === id ? ' akt' : ''}`, label) as HTMLButtonElement;
      b.onclick = () => {
        zakladka = id;
        przerysuj();
      };
      return b;
    };
    tabs.append(mk('moje', 'Moje'), mk('top', 'Top'));
    root.append(tabs);

    root.append(zakladka === 'moje' ? widokMoje() : widokTop());
    return root;
  }

  // ── Open / aliases ───────────────────────────────────────────────────────────

  async function otworz(): Promise<void> {
    if (!popup) {
      popup = await api.ui.registerPersistentPopup({
        id: 'rkg-hof',
        title: 'RKG — Sala Chwaly',
        createContent: build,
      });
    }
    if (!popup.isOpen) await popup.open();
    else przerysuj();
  }

  api.ui.addPopupMenuEntry('RKG — Sala Chwaly', () => void otworz());
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
      storage.set(KL_ZGODA, false);
      info('nick usuniety, zgoda cofnieta');
      return true;
    }
    if (!WZORZEC_NICKA.test(arg)) {
      info('nick: 2-16 znakow A-Z, 0-9, _ lub -');
      return true;
    }
    storage.set(KL_NICK, arg);
    info(`nick ustawiony: ${arg}`);
    return true;
  });

  api.aliases.register(/^rkgwall(?:\s+(.+))?$/i, (m) => {
    const arg = m?.[1]?.trim();
    if (!arg) {
      info(`wall: ${wallBase()}`);
      return true;
    }
    if (!/^https?:\/\//.test(arg)) {
      info('podaj pelny adres, np. rkgwall https://rkg-wall.twoj.workers.dev');
      return true;
    }
    storage.set(KL_WALL, arg.replace(/\/+$/, ''));
    info(`wall ustawiony: ${wallBase()}`);
    return true;
  });

  return () => {
    for (const c of aktywne) c.abort();
    aktywne.clear();
    popup?.close();
    popup = null;
  };
}

const STYLE = `
.rkg-hof { min-width: 280px; max-width: 420px; font: 13px/1.45 system-ui, sans-serif; }
.rkg-tabs { display: flex; gap: 6px; margin-bottom: 10px; }
.rkg-tab { border: 1px solid #8884; background: transparent; color: inherit; padding: 5px 14px; border-radius: 999px; cursor: pointer; }
.rkg-tab.akt { background: #f0b42933; border-color: #f0b429; font-weight: 600; }
.rkg-lista { display: flex; flex-direction: column; gap: 8px; max-height: 55vh; overflow-y: auto; }
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
