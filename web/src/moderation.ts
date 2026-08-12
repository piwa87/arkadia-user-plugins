import type { AkcjaModeracji, PozycjaModeracji } from '../../src/shared/rkg-api';
import { apiErrorMessage, fetchModeration, submitModeration } from './api';
import { element, escapeHtml } from './dom';
import { adminKey, rememberAdminKey } from './local-state';

export interface Moderation {
  open(): void;
  login(key: string): Promise<void>;
  apply(id: string, action: AkcjaModeracji): Promise<void>;
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
        <small>${entry.wynikGlosow} glosow · ${entry.zgloszenia}× wylosowany</small>
        ${entry.raporty > 0 ? `<small class="admin-powody">wulgarne ${entry.raportyPowody.wulgarne} · osoba ${entry.raportyPowody.osoba} · inne ${entry.raportyPowody.inne}</small>` : ''}
      </div>
      <div class="admin-akcje">
        <button data-admin-id="${entry.id}" data-admin-action="${entry.ukryte ? 'przywroc' : 'ukryj'}" ${pending.has(entry.id) ? 'disabled' : ''}>${entry.ukryte ? 'Przywroc' : 'Ukryj'}</button>
        <button class="usun" data-admin-id="${entry.id}" data-admin-action="usun" ${pending.has(entry.id) ? 'disabled' : ''}>Usun</button>
      </div>
    </article>`).join('');
}

export function createModeration(refreshRanking: () => Promise<void>): Moderation {
  let entries: PozycjaModeracji[] = [];
  const pending = new Set<string>();

  function render(): void {
    element('#admin-lista').innerHTML = moderationRows(entries, pending);
  }

  async function load(): Promise<void> {
    const status = element('#admin-status');
    status.textContent = 'Sprawdzam przepustke…';
    try {
      entries = (await fetchModeration(adminKey())).pozycje;
      element<HTMLInputElement>('#admin-klucz').value = '';
      status.textContent = '';
    } catch (error) {
      entries = [];
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
    if (action === 'usun' && !globalThis.confirm('Usunac ten jeden klub bez mozliwosci cofniecia?')) return;
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

  return { open, login, apply };
}
