import type { PluginApi } from '@arkadia/plugin-types';
import type {
  GlosResponse,
  ListaResponse,
  Pozycja,
  StatusLimitu,
  WpisLokalny,
} from '../../shared/rkg-api';
import { formatWait } from './publisher';
import type { Baza } from './store';
import type { WallClient } from './wall-client';

type Tab = 'lokalne' | 'top';

export interface HofView {
  open(tab?: Tab): Promise<void>;
  refresh(): void;
  resetTop(): void;
  stop(): void;
}

interface ViewOptions {
  api: PluginApi;
  baza: Baza;
  wall: WallClient;
  info(text: string): void;
  onSend(wpis: WpisLokalny): void;
  limitStatus(): StatusLimitu | null;
  refreshLimit(): Promise<StatusLimitu | null>;
}

/** The RKG browse popup: local captures, public ranking and votes. */
export function createHofView(options: ViewOptions): HofView {
  const { api, baza, wall, info, onSend, limitStatus, refreshLimit } = options;
  let popup: Awaited<ReturnType<PluginApi['ui']['registerPersistentPopup']>> | null = null;
  let tab: Tab = 'lokalne';
  let topEntries: Pozycja[] | null = null;
  let topError = '';
  const countdown = setInterval(() => {
    if (popup?.isOpen) refresh();
  }, 60_000);

  const el = (tag: string, className = '', text?: string): HTMLElement => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  function refresh(): void {
    if (popup) popup.setBody(build());
  }

  async function vote(id: string, value: 1 | -1): Promise<void> {
    const response = await wall.request<GlosResponse>(`/api/nazwy/${id}/glos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ glosujacy: wall.voterId(), wartosc: value }),
    });
    if (!response.ok) info(`glos nie przeszedl (${response.blad})`);
    if (tab === 'top') await loadTop();
    else refresh();
  }

  async function loadTop(): Promise<void> {
    const response = await wall.request<ListaResponse>('/api/nazwy?sort=top&limit=25');
    if (response.ok) {
      topEntries = response.dane.pozycje;
      topError = '';
    } else {
      topError = response.blad;
    }
    refresh();
  }

  function localView(): HTMLElement {
    const column = el('div', 'rkg-kolumna');
    const list = el('div', 'rkg-lista');
    const limit = limitStatus();
    const badge = el(
      'div',
      `rkg-limit ${limit?.dostepny ? 'gotowy' : limit ? 'czeka' : 'sprawdza'}`,
      limit?.dostepny
        ? 'SLOT GOTOWY — mozesz wyslac jeden klub'
        : limit
          ? `SLOT ZAJETY — kolejny za ${formatWait(limit.ponownieZaMs)}`
          : 'SLOT DZIENNY — sprawdzam…',
    );
    column.append(badge);

    if (baza.wpisy.length === 0) {
      list.append(el('p', 'rkg-pusto', 'Brak zebranych klubow. Uzyj rkg! w grze.'));
      column.append(list);
      return column;
    }

    for (const wpis of [...baza.wpisy].reverse()) {
      const row = el('div', 'rkg-wpis');
      const content = el('div', 'rkg-tresc');
      content.append(el('div', 'rkg-nazwa', wpis.wynik));
      if (wpis.role?.przywodca) {
        content.append(el('div', 'rkg-rola', `👑 ${wpis.role.przywodca}`));
      }
      row.append(content);

      const send = el(
        'button',
        'rkg-btn',
        wpis.wyslane ? '✓ w rankingu' : 'Wyslij',
      ) as HTMLButtonElement;
      send.disabled = !!wpis.wyslane;
      if (!wpis.wyslane) {
        send.title = 'Wymaga potwierdzenia i wykorzystuje jeden slot na 24 godziny';
        send.onclick = () => onSend(wpis);
      }
      row.append(send);

      if (!wpis.wyslane) {
        const remove = el('button', 'rkg-usun', '✕') as HTMLButtonElement;
        remove.title = 'Usun z lokalnych';
        remove.onclick = () => {
          baza.usun(wpis.id);
          refresh();
        };
        row.append(remove);
      }
      list.append(row);
    }
    column.append(list);

    const unsent = baza.wpisy.filter((wpis) => !wpis.wyslane).length;
    if (unsent > 0) {
      const footer = el('div', 'rkg-stopka');
      const clear = el(
        'button',
        'rkg-btn',
        `Usun niewyslane (${unsent})`,
      ) as HTMLButtonElement;
      clear.title = 'Kluby juz wyslane do rankingu zostaja';
      clear.onclick = () => {
        const count = baza.usunNiewyslane();
        info(`usunieto lokalnie: ${count}`);
        refresh();
      };
      footer.append(clear);
      column.append(footer);
    }
    return column;
  }

  function topView(): HTMLElement {
    const list = el('div', 'rkg-lista');
    if (topEntries === null) {
      list.append(el('p', 'rkg-pusto', 'Ladowanie…'));
      void loadTop();
      return list;
    }
    if (topError) {
      list.append(el('p', 'rkg-pusto', `Wall niedostepny (${topError}).`));
      return list;
    }
    if (topEntries.length === 0) {
      list.append(el('p', 'rkg-pusto', 'Jeszcze pusto — wyslij pierwszy klub!'));
      return list;
    }
    topEntries.forEach((entry, index) => {
      const row = el('div', 'rkg-wpis');
      const votes = el('div', 'rkg-glosy');
      const up = el('button', 'rkg-strzalka', '▲') as HTMLButtonElement;
      up.onclick = () => void vote(entry.id, 1);
      const down = el('button', 'rkg-strzalka', '▼') as HTMLButtonElement;
      down.onclick = () => void vote(entry.id, -1);
      votes.append(up, el('span', 'rkg-wynik', String(entry.wynikGlosow)), down);
      const content = el('div', 'rkg-tresc');
      content.append(el('div', 'rkg-nazwa', `#${index + 1} ${entry.wynik}`));
      if (entry.nick) content.append(el('div', 'rkg-rola', `od ${entry.nick}`));
      row.append(votes, content);
      list.append(row);
    });
    return list;
  }

  function build(): HTMLElement {
    const root = el('div', 'rkg-hof');
    root.append(el('style', '', STYLE));

    const tabs = el('div', 'rkg-tabs');
    const makeTab = (id: Tab, label: string) => {
      const button = el('button', `rkg-tab${tab === id ? ' akt' : ''}`, label) as HTMLButtonElement;
      button.onclick = () => {
        tab = id;
        refresh();
      };
      return button;
    };
    tabs.append(makeTab('lokalne', 'Lokalne'), makeTab('top', 'Top (ranking)'));
    root.append(tabs);
    root.append(tab === 'lokalne' ? localView() : topView());
    return root;
  }

  async function open(nextTab?: Tab): Promise<void> {
    if (nextTab) tab = nextTab;
    void refreshLimit();
    if (!popup) {
      popup = await api.ui.registerPersistentPopup({
        id: 'rkg-hof',
        title: 'RKG',
        createContent: build,
      });
    }
    if (!popup.isOpen) await popup.open();
    else refresh();
  }

  return {
    open,
    refresh,
    resetTop: () => {
      topEntries = null;
      topError = '';
      refresh();
    },
    stop: () => {
      clearInterval(countdown);
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
.rkg-limit { flex: 0 0 auto; margin-bottom: 9px; padding: 7px 10px; border: 1px solid #8884; border-radius: 8px; font-size: .76rem; font-weight: 750; letter-spacing: .04em; }
.rkg-limit.gotowy { color: #9bdc91; border-color: #62b36b88; background: #62b36b18; }
.rkg-limit.czeka { color: #f0c76a; border-color: #f0b42988; background: #f0b42916; }
.rkg-limit.sprawdza { opacity: .65; }
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
