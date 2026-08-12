import type { AkcjaModeracji, PozycjaModeracji } from '../../src/shared/rkg-api';
import { fetchModeration, submitModeration } from './api';
import { element, escapeHtml } from './dom';
import { adminKey, rememberAdminKey } from './local-state';

export interface Moderation {
  open(): void;
  login(key: string): Promise<void>;
  apply(id: string, action: AkcjaModeracji): Promise<void>;
}

export function moderationRows(entries: readonly PozycjaModeracji[]): string {
  if (entries.length === 0) return '<p class="admin-pusto">Brak pozycji do pokazania.</p>';
  return entries.map((entry) => `
    <article class="admin-wpis ${entry.ukryte ? 'ukryty' : ''}">
      <div>
        <span class="admin-stempel">${entry.ukryte ? 'UKRYTY' : `${entry.raporty} RAPORTY`}</span>
        <strong>${escapeHtml(entry.wynik)}</strong>
        <small>${entry.wynikGlosow} glosow · ${entry.zgloszenia}× wylosowany</small>
        ${entry.raporty > 0 ? `<small class="admin-powody">wulgarne ${entry.raportyPowody.wulgarne} · osoba ${entry.raportyPowody.osoba} · inne ${entry.raportyPowody.inne}</small>` : ''}
      </div>
      <div class="admin-akcje">
        <button data-admin-id="${entry.id}" data-admin-action="${entry.ukryte ? 'przywroc' : 'ukryj'}">${entry.ukryte ? 'Przywroc' : 'Ukryj'}</button>
        <button class="usun" data-admin-id="${entry.id}" data-admin-action="usun">Usun</button>
      </div>
    </article>`).join('');
}

export function createModeration(refreshRanking: () => Promise<void>): Moderation {
  let entries: PozycjaModeracji[] = [];

  function render(): void {
    element('#admin-lista').innerHTML = moderationRows(entries);
  }

  async function load(): Promise<void> {
    const status = element('#admin-status');
    status.textContent = 'Sprawdzam przepustke…';
    try {
      entries = (await fetchModeration(adminKey())).pozycje;
      element<HTMLInputElement>('#admin-klucz').value = '';
      status.textContent = '';
    } catch {
      entries = [];
      status.textContent = 'Klucz nie pasuje albo moderacja jest wylaczona.';
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
    if (action === 'usun' && !globalThis.confirm('Usunac ten jeden klub bez mozliwosci cofniecia?')) return;
    const status = element('#admin-status');
    status.textContent = 'Zapisuje zmiane…';
    try {
      await submitModeration(id, action, adminKey());
      await Promise.all([load(), refreshRanking()]);
    } catch {
      status.textContent = 'Nie udalo sie wykonac tej akcji.';
    }
  }

  return { open, login, apply };
}
