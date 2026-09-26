import type { PluginApi } from '@arkadia/plugin-types';
import type { PokFinding } from './index';

export interface PokViewRow {
  finding: PokFinding;
  distance: number | null;
  current: boolean;
}

interface PokViewOptions {
  api: PluginApi;
  getRows(): PokViewRow[];
  setTarget(row: PokViewRow): void;
  startWalking(row: PokViewRow): void;
  toggle(row: PokViewRow): void;
  preview(row: PokViewRow): void;
  remove(row: PokViewRow): void;
  reviveAll(): void;
}

export interface PokView {
  open(): Promise<void>;
  refresh(): void;
  stop(): void;
}

export function createPokView(options: PokViewOptions): PokView {
  const { api } = options;
  let popup: Awaited<ReturnType<PluginApi['ui']['registerPersistentPopup']>> | null = null;

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
    if (popup?.isOpen) popup.setBody(build());
  }

  function build(): HTMLElement {
    const root = el('div', 'pok-panel');
    const style = el('style');
    style.textContent = STYLE;
    root.append(style);

    const rows = options.getRows();
    root.append(el('div', 'pok-summary', `${rows.length} ${rows.length === 1 ? 'wpis' : 'wpisow'}`));

    if (rows.length === 0) {
      root.append(el('div', 'pok-empty', 'Brak zapisanych stworow.'));
      return root;
    }

    const scroller = el('div', 'pok-scroll');
    const table = el('table', 'pok-table');
    const head = el('thead');
    const headerRow = el('tr');
    for (const label of ['ID', 'Dist.', 'Stwor', 'Obszar', 'Stan', 'Akcje']) {
      headerRow.append(el('th', '', label));
    }
    head.append(headerRow);
    table.append(head);

    const body = el('tbody');
    for (const row of rows) {
      const { finding } = row;
      const tr = el('tr', `${finding.slain ? 'pok-dead' : 'pok-alive'}${row.current ? ' pok-current' : ''}`);

      const roomCell = el('td');
      roomCell.append(actionButton(
        String(finding.roomId),
        'pok-link pok-room',
        `Ustaw cel: ${finding.short} (${finding.roomId})`,
        () => options.setTarget(row),
      ));

      const distanceCell = el('td');
      distanceCell.append(actionButton(
        row.distance === null ? '—' : String(row.distance),
        'pok-link pok-distance',
        `Idz do: ${finding.short} (${finding.roomId})`,
        () => options.startWalking(row),
      ));

      const shortCell = el('td', 'pok-short', finding.short);
      shortCell.title = finding.short;
      const areaCell = el('td', 'pok-area', finding.areaName);
      areaCell.title = finding.areaName;

      const statusCell = el('td');
      statusCell.append(actionButton(
        finding.slain ? '💀' : '\u00a0',
        finding.slain ? 'pok-status pok-status-dead' : 'pok-status pok-status-alive',
        finding.slain ? 'Oznacz jako zywego' : 'Oznacz jako ubitego',
        () => options.toggle(row),
      ));

      const actionsCell = el('td', 'pok-actions');
      actionsCell.append(
        actionButton('👁', 'pok-icon', `Podglad: ${finding.roomId}`, () => options.preview(row)),
        actionButton('🗑', 'pok-icon pok-remove', `Usun: ${finding.short} (${finding.roomId})`, () => options.remove(row)),
      );
      tr.append(roomCell, distanceCell, shortCell, areaCell, statusCell, actionsCell);
      body.append(tr);
    }
    table.append(body);
    scroller.append(table);
    root.append(scroller);

    const deadCount = rows.filter(({ finding }) => finding.slain).length;
    const reviveAll = actionButton(
      'Oznacz wszystkie jako zywe',
      'pok-revive-all',
      deadCount === 0
        ? 'Wszystkie stwory sa juz oznaczone jako zywe'
        : `Oznacz jako zywe: ${deadCount}`,
      options.reviveAll,
    );
    reviveAll.disabled = deadCount === 0;
    root.append(reviveAll);
    return root;
  }

  async function open(): Promise<void> {
    if (!popup) {
      popup = await api.ui.registerPersistentPopup({
        id: 'pokoniuchy',
        title: 'Pokoniuchy',
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
.pok-panel {
  --pok-line: #71809642;
  --pok-muted: #9aa3ad;
  --pok-green: #5e9b74;
  --pok-green-soft: #5e9b741f;
  --pok-dead: #7e4b51;
  --pok-dead-soft: #7e4b5117;
  min-width: 520px;
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
.pok-summary { color: var(--pok-muted); font-variant-numeric: tabular-nums; flex: 0 0 auto; }
.pok-scroll { min-height: 0; flex: 1 1 auto; overflow: auto; border: 1px solid var(--pok-line); border-radius: 5px; }
.pok-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.pok-table th { position: sticky; top: 0; z-index: 1; padding: 4px 5px; text-align: left; font-size: 9px; font-weight: 650; color: var(--pok-muted); background: #20232d; border-bottom: 1px solid var(--pok-line); white-space: nowrap; }
.pok-table td { padding: 3px 5px; border-bottom: 1px solid #71809624; white-space: nowrap; }
.pok-table tr:last-child td { border-bottom: 0; }
.pok-table tr.pok-alive { background: var(--pok-green-soft); }
.pok-table tr.pok-dead { color: #777d85; background: var(--pok-dead-soft); }
.pok-table tr.pok-current td:first-child { box-shadow: inset 3px 0 var(--pok-green); }
.pok-link, .pok-status, .pok-icon { border: 0; background: none; color: inherit; font: inherit; cursor: pointer; padding: 1px 2px; border-radius: 3px; text-decoration: none !important; }
.pok-room { color: #72b58a; font-weight: 650; }
.pok-distance { min-width: 22px; text-align: right; }
.pok-short { max-width: 220px; overflow: hidden; text-overflow: ellipsis; font-weight: 650; }
.pok-area { max-width: 180px; overflow: hidden; text-overflow: ellipsis; color: var(--pok-muted); }
.pok-status { min-width: 24px; border: 1px solid var(--pok-line); padding: 1px 4px; }
.pok-status-alive { color: #9fc9ad; border-color: #5e9b7466; }
.pok-status-dead { color: #d28a91; border-color: #7e4b5166; }
.pok-actions { display: flex; gap: 1px; }
.pok-icon { opacity: .7; font-size: 1em; }
.pok-revive-all { align-self: stretch; flex: 0 0 auto; border: 1px solid #5e9b7466; border-radius: 4px; background: var(--pok-green-soft); color: #a8d5b7; padding: 4px 7px; font: inherit; cursor: pointer; }
.pok-revive-all:disabled { border-color: var(--pok-line); background: transparent; color: var(--pok-muted); cursor: default; opacity: .55; }
.pok-link:focus-visible, .pok-status:focus-visible, .pok-icon:focus-visible, .pok-revive-all:focus-visible { outline: 2px solid #78a98a; outline-offset: 1px; }
.pok-empty { display: grid; place-items: center; flex: 1; color: var(--pok-muted); }
@media (max-width: 560px) {
  .pok-panel { min-width: 420px; padding: 6px; }
  .pok-short { max-width: 150px; }
  .pok-area { max-width: 120px; }
  .pok-table th, .pok-table td { padding-left: 3px; padding-right: 3px; }
}
@media (prefers-reduced-motion: reduce) {
  .pok-panel * { scroll-behavior: auto !important; }
}
`;
