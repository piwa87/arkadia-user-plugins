import type { PluginApi } from '@arkadia/plugin-types';

export interface TroViewRow {
  storageKey: string | null;
  active: boolean;
  mobType: string;
  roomId: number;
  time: number;
  distance: number | null;
  current: boolean;
}

interface TroViewOptions {
  api: PluginApi;
  getRows(): TroViewRow[];
  setTarget(row: TroViewRow): void;
  startWalking(row: TroViewRow): void;
  toggle(row: TroViewRow): void;
  preview(row: TroViewRow): void;
  remove(row: TroViewRow): void;
}

export interface TroView {
  open(): Promise<void>;
  refresh(): void;
  stop(): void;
}

const DEFAULT_LIMIT = 30;

export function createTroView(options: TroViewOptions): TroView {
  const { api } = options;
  let popup: Awaited<ReturnType<PluginApi['ui']['registerPersistentPopup']>> | null = null;
  let showAll = false;
  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className = '',
    text?: string,
  ): HTMLElementTagNameMap[K] => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const actionButton = (
    label: string,
    className: string,
    title: string,
    action: () => void,
  ): HTMLButtonElement => {
    const button = el('button', className, label);
    button.type = 'button';
    button.title = title;
    button.onclick = action;
    return button;
  };

  function refresh(): void {
    if (popup) popup.setBody(build());
  }

  function build(): HTMLElement {
    const root = el('div', 'tro-panel');
    const style = el('style');
    style.textContent = STYLE;
    root.append(style);

    const orderedRows = options.getRows();
    const visibleRows = showAll ? orderedRows : orderedRows.slice(0, DEFAULT_LIMIT);
    const toolbar = el('div', 'tro-toolbar');
    const summary = el(
      'div',
      'tro-summary',
      showAll || orderedRows.length <= DEFAULT_LIMIT
        ? `${visibleRows.length} lokacji`
        : `${visibleRows.length} z ${orderedRows.length} najblizszych`,
    );
    const mode = el('div', 'tro-mode');
    const nearest = actionButton('Najblizsze 30', `tro-mode-btn${showAll ? '' : ' akt'}`, 'Pokaz najblizsze lokacje', () => {
      showAll = false;
      refresh();
    });
    const all = actionButton('Wszystkie', `tro-mode-btn${showAll ? ' akt' : ''}`, 'Pokaz cala liste', () => {
      showAll = true;
      refresh();
    });
    mode.append(nearest, all);
    toolbar.append(summary, mode);
    root.append(toolbar);

    if (visibleRows.length === 0) {
      root.append(el('div', 'tro-empty', 'Brak wpisow pbt/besti.'));
      return root;
    }

    const scroller = el('div', 'tro-scroll');
    const table = el('table', 'tro-table');
    const head = el('thead');
    const headerRow = el('tr');
    for (const label of ['ID', 'Dist.', 'Typ', 'Stan', 'Akcje']) {
      headerRow.append(el('th', '', label));
    }
    head.append(headerRow);
    table.append(head);

    const body = el('tbody');
    for (const row of visibleRows) {
      const tr = el('tr', `${row.active ? 'tro-alive' : 'tro-dead'}${row.current ? ' tro-current' : ''}`);

      const roomCell = el('td');
      roomCell.append(actionButton(
        String(row.roomId),
        'tro-link tro-room',
        `Ustaw cel: ${row.mobType} (${row.roomId})`,
        () => options.setTarget(row),
      ));

      const distanceCell = el('td');
      distanceCell.append(actionButton(
        row.distance === null ? '—' : String(row.distance),
        'tro-link tro-distance',
        `Idz do: ${row.mobType} (${row.roomId})`,
        () => options.startWalking(row),
      ));

      const typeCell = el('td', 'tro-type', row.mobType);
      const statusCell = el('td');
      statusCell.append(actionButton(
        row.active ? '\u00a0' : '💀',
        row.active ? 'tro-status tro-status-alive' : 'tro-status tro-status-dead',
        row.active ? 'Oznacz jako ubitego' : 'Oznacz jako zywego',
        () => options.toggle(row),
      ));

      const actionsCell = el('td', 'tro-actions');
      actionsCell.append(
        actionButton('👁', 'tro-icon', `Podglad: ${row.roomId}`, () => options.preview(row)),
        actionButton('🗑', 'tro-icon tro-remove', `Usun: ${row.mobType} (${row.roomId})`, () => options.remove(row)),
      );
      tr.append(roomCell, distanceCell, typeCell, statusCell, actionsCell);
      body.append(tr);
    }
    table.append(body);
    scroller.append(table);
    root.append(scroller);
    return root;
  }

  async function open(): Promise<void> {
    if (!popup) {
      popup = await api.ui.registerPersistentPopup({
        id: 'trolle',
        title: 'Trolle',
        createContent: build,
      });
    }
    if (!popup.isOpen) await popup.open();
    else refresh();
  }

  return {
    open,
    refresh,
    stop: () => {
      popup?.close();
      popup = null;
    },
  };
}

const STYLE = `
.tro-panel {
  --tro-line: #71809642;
  --tro-muted: #9aa3ad;
  --tro-green: #5e9b74;
  --tro-green-soft: #5e9b741f;
  --tro-dead: #7e4b51;
  --tro-dead-soft: #7e4b5117;
  min-width: 300px;
  height: 100%;
  min-height: 240px;
  padding: 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: inherit;
  font: 11px/1.25 system-ui, sans-serif;
}
.tro-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 7px; flex: 0 0 auto; }
.tro-summary { color: var(--tro-muted); font-variant-numeric: tabular-nums; }
.tro-mode { display: inline-flex; border: 1px solid var(--tro-line); border-radius: 4px; overflow: hidden; }
.tro-mode-btn { border: 0; border-right: 1px solid var(--tro-line); background: transparent; color: inherit; padding: 3px 6px; font-size: 10px; cursor: pointer; }
.tro-mode-btn:last-child { border-right: 0; }
.tro-mode-btn.akt { color: #a8d5b7; background: var(--tro-green-soft); }
.tro-scroll { min-height: 0; flex: 1 1 auto; overflow: auto; border: 1px solid var(--tro-line); border-radius: 5px; }
.tro-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.tro-table th { position: sticky; top: 0; z-index: 1; padding: 4px 5px; text-align: left; font-size: 9px; font-weight: 650; color: var(--tro-muted); background: #20232d; border-bottom: 1px solid var(--tro-line); white-space: nowrap; }
.tro-table td { padding: 3px 5px; border-bottom: 1px solid #71809624; white-space: nowrap; }
.tro-table tr:last-child td { border-bottom: 0; }
.tro-table tr.tro-alive { background: var(--tro-green-soft); }
.tro-table tr.tro-dead { color: #777d85; background: var(--tro-dead-soft); }
.tro-table tr.tro-current td:first-child { box-shadow: inset 3px 0 var(--tro-green); }
.tro-link, .tro-status, .tro-icon { border: 0; background: none; color: inherit; font: inherit; cursor: pointer; padding: 1px 2px; border-radius: 3px; text-decoration: none !important; }
.tro-room { color: #72b58a; font-weight: 650; }
.tro-distance { min-width: 22px; text-align: right; }
.tro-type { max-width: 58px; overflow: hidden; text-overflow: ellipsis; font-weight: 650; }
.tro-status { min-width: 24px; border: 1px solid var(--tro-line); padding: 1px 4px; }
.tro-status-alive { color: #9fc9ad; border-color: #5e9b7466; }
.tro-status-dead { color: #d28a91; border-color: #7e4b5166; }
.tro-actions { display: flex; gap: 1px; }
.tro-icon { opacity: .7; font-size: 1em; }
.tro-link:focus-visible, .tro-status:focus-visible, .tro-icon:focus-visible, .tro-mode-btn:focus-visible { outline: 2px solid #78a98a; outline-offset: 1px; }
.tro-empty { display: grid; place-items: center; flex: 1; color: var(--tro-muted); }
@media (max-width: 340px) {
  .tro-panel { min-width: 260px; padding: 6px; }
  .tro-table th, .tro-table td { padding-left: 3px; padding-right: 3px; }
}
@media (prefers-reduced-motion: reduce) {
  .tro-panel * { scroll-behavior: auto !important; }
}
`;
