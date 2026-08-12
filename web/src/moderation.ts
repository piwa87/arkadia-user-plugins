import type {
  AkcjaModeracji,
  PozycjaModeracji,
  WpisHistoriiModeracji,
} from '../../src/shared/rkg-api';
import { apiErrorMessage, fetchModeration, submitModeration } from './api';
import { element, escapeHtml } from './dom';
import { adminKey, rememberAdminKey } from './local-state';

export interface Moderation {
  open(): void;
  login(key: string): Promise<void>;
  apply(id: string, action: AkcjaModeracji): Promise<void>;
  changeView(view: string): void;
}

export type WidokModeracji = 'zgloszone' | 'ukryte' | 'wszystkie' | 'historia';

const WIDOKI: readonly WidokModeracji[] = ['zgloszone', 'ukryte', 'wszystkie', 'historia'];

function isView(value: string): value is WidokModeracji {
  return (WIDOKI as readonly string[]).includes(value);
}

function actionLabel(action: AkcjaModeracji): string {
  if (action === 'ukryj') return 'Ukryto';
  if (action === 'przywroc') return 'Przywrócono';
  if (action === 'odrzuc') return 'Odrzucono raporty';
  return 'Usunięto';
}

export function moderationHistory(entries: readonly WpisHistoriiModeracji[]): string {
  if (entries.length === 0) return '<p class="admin-pusto">Historia jest jeszcze pusta.</p>';
  return entries.map((entry) => `
    <article class="admin-historia">
      <span class="admin-stempel">${actionLabel(entry.akcja)}</span>
      <strong>${escapeHtml(entry.wynik)}</strong>
      <small>${new Date(entry.kiedy).toLocaleString('pl-PL')} · raporty: ${entry.raporty}</small>
    </article>`).join('');
}

export function filterModeration(
  entries: readonly PozycjaModeracji[],
  view: WidokModeracji,
): PozycjaModeracji[] {
  if (view === 'zgloszone') return entries.filter((entry) => entry.raporty > 0);
  if (view === 'ukryte') return entries.filter((entry) => entry.ukryte);
  return view === 'wszystkie' ? [...entries] : [];
}

export function moderationTabs(
  view: WidokModeracji,
  entries: readonly PozycjaModeracji[],
  historyCount: number,
): string {
  const counts: Record<WidokModeracji, number> = {
    zgloszone: entries.filter((entry) => entry.raporty > 0).length,
    ukryte: entries.filter((entry) => entry.ukryte).length,
    wszystkie: entries.length,
    historia: historyCount,
  };
  const labels: Record<WidokModeracji, string> = {
    zgloszone: 'Zgłoszone',
    ukryte: 'Ukryte',
    wszystkie: 'Wszystkie',
    historia: 'Historia',
  };
  return WIDOKI.map((item) => `
    <button class="admin-tab ${view === item ? 'akt' : ''}" data-admin-view="${item}" aria-pressed="${view === item}">
      ${labels[item]} <span>${counts[item]}</span>
    </button>`).join('');
}

export function moderationRows(
  entries: readonly PozycjaModeracji[],
  pending: ReadonlySet<string> = new Set(),
): string {
  if (entries.length === 0) return '<p class="admin-pusto">Brak pozycji do pokazania.</p>';
  return entries.map((entry) => `
    <article class="admin-wpis ${entry.ukryte ? 'ukryty' : ''}" ${pending.has(entry.id) ? 'aria-busy="true"' : ''}>
      <div>
        <span class="admin-stempel">${entry.ukryte ? 'UKRYTY' : `${entry.raporty} RAPORTY`}</span>
        <strong>${escapeHtml(entry.wynik)}</strong>
        <small>${entry.wynikGlosow} głosów · ${entry.zgloszenia}× wylosowany</small>
        ${entry.raporty > 0 ? `<small class="admin-powody">wulgarne ${entry.raportyPowody.wulgarne} · osoba ${entry.raportyPowody.osoba} · inne ${entry.raportyPowody.inne}</small>` : ''}
      </div>
      <div class="admin-akcje">
        ${entry.raporty > 0 ? `<button data-admin-id="${entry.id}" data-admin-action="odrzuc" ${pending.has(entry.id) ? 'disabled' : ''}>Odrzuć raporty</button>` : ''}
        <button data-admin-id="${entry.id}" data-admin-action="${entry.ukryte ? 'przywroc' : 'ukryj'}" ${pending.has(entry.id) ? 'disabled' : ''}>${entry.ukryte ? 'Przywróć' : 'Ukryj'}</button>
        <button class="usun" data-admin-id="${entry.id}" data-admin-action="usun" ${pending.has(entry.id) ? 'disabled' : ''}>Usuń</button>
      </div>
    </article>`).join('');
}

export function createModeration(refreshRanking: () => Promise<void>): Moderation {
  let entries: PozycjaModeracji[] = [];
  let history: WpisHistoriiModeracji[] = [];
  let view: WidokModeracji = 'zgloszone';
  let authenticated = false;
  const pending = new Set<string>();

  function render(): void {
    const tabs = element<HTMLElement>('#admin-tabs');
    tabs.hidden = !authenticated;
    tabs.innerHTML = authenticated ? moderationTabs(view, entries, history.length) : '';
    element('#admin-lista').innerHTML = view === 'historia'
      ? moderationHistory(history)
      : moderationRows(filterModeration(entries, view), pending);
  }

  async function load(): Promise<void> {
    const status = element('#admin-status');
    status.textContent = 'Sprawdzam przepustkę…';
    try {
      const data = await fetchModeration(adminKey());
      entries = data.pozycje;
      history = data.historia;
      authenticated = true;
      element<HTMLInputElement>('#admin-klucz').value = '';
      status.textContent = '';
    } catch (error) {
      entries = [];
      history = [];
      authenticated = false;
      status.textContent = apiErrorMessage(
        error,
        'Nie udało się otworzyć moderacji.',
      );
    }
    render();
  }

  function open(): void {
    element<HTMLDialogElement>('#admin-dialog').showModal();
    if (adminKey()) void load();
  }

  async function login(key: string): Promise<void> {
    rememberAdminKey(key);
    await load();
  }

  async function apply(id: string, action: AkcjaModeracji): Promise<void> {
    if (pending.has(id)) return;
    if (action === 'usun' && !globalThis.confirm('Usunąć ten jeden klub bez możliwości cofnięcia?')) return;
    const status = element('#admin-status');
    pending.add(id);
    render();
    status.textContent = 'Zapisuję zmianę…';
    try {
      await submitModeration(id, action, adminKey());
      await Promise.all([load(), refreshRanking()]);
    } catch (error) {
      status.textContent = apiErrorMessage(
        error,
        'Nie udało się wykonać tej akcji.',
      );
    } finally {
      pending.delete(id);
      render();
    }
  }

  function changeView(next: string): void {
    if (!isView(next) || next === view) return;
    view = next;
    render();
  }

  return { open, login, apply, changeView };
}
