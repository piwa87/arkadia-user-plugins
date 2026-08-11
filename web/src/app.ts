import type {
  AkcjaModeracji,
  GlosResponse,
  ListaModeracjiResponse,
  ListaResponse,
  Pozycja,
  PozycjaModeracji,
  PowodRaportu,
  RaportResponse,
  Sortowanie,
} from '../../src/shared/rkg-api';
import { mozeDopisac, scal } from './lista';

/**
 * RKG — the public ranking of generated club names.
 *
 * Static page served by the same Worker that exposes the API, so every call is
 * same-origin. Vote identity is one random id kept in localStorage; there are no
 * accounts.
 */

const KLUCZ_GLOSUJACY = 'rkg:glosujacy';
const KLUCZ_RAPORTY = 'rkg:raporty';
const KLUCZ_ADMIN = 'rkg:admin';

function glosujacy(): string {
  let id = localStorage.getItem(KLUCZ_GLOSUJACY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KLUCZ_GLOSUJACY, id);
  }
  return id;
}

// Remember this device's own votes so the arrows can show an active state.
const KLUCZ_MOJE = 'rkg:mojeGlosy';
function mojeGlosy(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KLUCZ_MOJE) ?? '{}');
  } catch {
    return {};
  }
}
function zapiszMojGlos(id: string, wartosc: number): void {
  const m = mojeGlosy();
  if (wartosc === 0) delete m[id];
  else m[id] = wartosc;
  localStorage.setItem(KLUCZ_MOJE, JSON.stringify(m));
}

const state: { sort: Sortowanie; cursor?: string; pozycje: Pozycja[]; ladowanie: boolean } = {
  sort: 'gorace',
  pozycje: [],
  ladowanie: false,
};
let raportId: string | null = null;
let adminEntries: PozycjaModeracji[] = [];

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

async function pobierz(dopisz = false): Promise<void> {
  if (state.ladowanie) return;
  // Without a cursor there is no next page, and asking anyway would re-fetch
  // page one and append it to itself.
  if (dopisz && !mozeDopisac(state.cursor, state.ladowanie)) return;
  state.ladowanie = true;
  render();

  const params = new URLSearchParams({ sort: state.sort });
  if (dopisz && state.cursor) params.set('cursor', state.cursor);
  try {
    const res = await fetch(`/api/nazwy?${params}`);
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as ListaResponse;
    state.pozycje = dopisz ? scal(state.pozycje, data.pozycje) : data.pozycje;
    state.cursor = data.cursor;
  } catch {
    if (!dopisz) state.pozycje = [];
    $('#blad').textContent = 'Nie udalo sie pobrac listy. Odswiez strone.';
  } finally {
    state.ladowanie = false;
    render();
  }
}

async function glosuj(id: string, kierunek: 1 | -1): Promise<void> {
  const aktualny = mojeGlosy()[id] ?? 0;
  // Clicking the active arrow again withdraws the vote.
  const wartosc: 1 | -1 | 0 = aktualny === kierunek ? 0 : kierunek;
  try {
    const res = await fetch(`/api/nazwy/${id}/glos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ glosujacy: glosujacy(), wartosc }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as GlosResponse;
    const poz = state.pozycje.find((p) => p.id === id);
    if (poz) poz.wynikGlosow = data.wynikGlosow;
    zapiszMojGlos(id, wartosc);
    render();
  } catch {
    $('#blad').textContent = 'Glos nie doszedl. Kliknij jeszcze raz.';
  }
}

function mojeRaporty(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KLUCZ_RAPORTY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function zapamietajRaport(id: string): void {
  const ids = mojeRaporty();
  ids.add(id);
  localStorage.setItem(KLUCZ_RAPORTY, JSON.stringify([...ids].slice(-200)));
}

function otworzRaport(id: string): void {
  raportId = id;
  const club = state.pozycje.find((entry) => entry.id === id);
  $('#raport-nazwa').textContent = club?.wynik ?? '';
  $('#raport-status').textContent = '';
  ($('#raport-dialog') as HTMLDialogElement).showModal();
}

async function zglos(powod: PowodRaportu): Promise<void> {
  if (!raportId) return;
  const id = raportId;
  const status = $('#raport-status');
  status.textContent = 'Wysylam zgloszenie…';
  try {
    const response = await fetch(`/api/nazwy/${id}/raport`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ glosujacy: glosujacy(), powod }),
    });
    if (!response.ok) throw new Error(String(response.status));
    const result = await response.json() as RaportResponse;
    zapamietajRaport(id);
    status.textContent = result.duplikat ? 'Ten klub byl juz przez Ciebie zgloszony.' : 'Zgloszenie przyjete.';
    render();
  } catch {
    status.textContent = 'Zgloszenie nie doszlo. Sprobuj pozniej.';
  }
}

function adminKey(): string {
  return sessionStorage.getItem(KLUCZ_ADMIN) ?? '';
}

function adminRequest(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: { ...init.headers, 'X-RKG-Admin': adminKey() },
  });
}

async function pobierzModeracje(): Promise<void> {
  const status = $('#admin-status');
  status.textContent = 'Sprawdzam przepustke…';
  try {
    const response = await adminRequest('/api/admin/nazwy');
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json() as ListaModeracjiResponse;
    adminEntries = data.pozycje;
    ($('#admin-klucz') as HTMLInputElement).value = '';
    status.textContent = '';
    renderModeracja();
  } catch {
    adminEntries = [];
    status.textContent = 'Klucz nie pasuje albo moderacja jest wylaczona.';
    renderModeracja();
  }
}

function renderModeracja(): void {
  const list = $('#admin-lista');
  if (adminEntries.length === 0) {
    list.innerHTML = '<p class="admin-pusto">Brak pozycji do pokazania.</p>';
    return;
  }
  list.innerHTML = adminEntries.map((entry) => `
    <article class="admin-wpis ${entry.ukryte ? 'ukryty' : ''}">
      <div>
        <span class="admin-stempel">${entry.ukryte ? 'UKRYTY' : `${entry.raporty} RAPORTY`}</span>
        <strong>${esc(entry.wynik)}</strong>
        <small>${entry.wynikGlosow} glosow · ${entry.zgloszenia}× wylosowany</small>
        ${entry.raporty > 0 ? `<small class="admin-powody">wulgarne ${entry.raportyPowody.wulgarne} · osoba ${entry.raportyPowody.osoba} · inne ${entry.raportyPowody.inne}</small>` : ''}
      </div>
      <div class="admin-akcje">
        <button data-admin-id="${entry.id}" data-admin-action="${entry.ukryte ? 'przywroc' : 'ukryj'}">${entry.ukryte ? 'Przywroc' : 'Ukryj'}</button>
        <button class="usun" data-admin-id="${entry.id}" data-admin-action="usun">Usun</button>
      </div>
    </article>`).join('');
}

async function moderuj(id: string, akcja: AkcjaModeracji): Promise<void> {
  if (akcja === 'usun' && !globalThis.confirm('Usunac ten jeden klub bez mozliwosci cofniecia?')) return;
  const status = $('#admin-status');
  status.textContent = 'Zapisuje zmiane…';
  try {
    const response = await adminRequest(`/api/admin/nazwy/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akcja }),
    });
    if (!response.ok) throw new Error(String(response.status));
    await Promise.all([pobierzModeracje(), pobierz(false)]);
  } catch {
    status.textContent = 'Nie udalo sie wykonac tej akcji.';
  }
}

/** One office per line — they are three distinct titles, not a bag of tags. */
function rola(ikona: string, tytul: string | undefined, klasa = ''): string {
  if (!tytul) return '';
  return `<div class="rola ${klasa}"><span class="ikona" aria-hidden="true">${ikona}</span><span>${esc(tytul)}</span></div>`;
}

function wiersz(p: Pozycja, i: number): string {
  const moj = mojeGlosy()[p.id] ?? 0;
  const role = p.role
    ? `<div class="role">
         ${rola('👑', p.role.przywodca, 'szef')}
         ${rola('🛡️', p.role.zastepca)}
         ${rola('⚔️', p.role.czlonek)}
       </div>`
    : '';
  const meta = [
    p.zgloszenia > 1 ? `<span class="licznik">${p.zgloszenia}× wylosowany</span>` : null,
    p.wynikOkresu != null ? `<span class="trend">${p.wynikOkresu >= 0 ? '+' : ''}${p.wynikOkresu} / 7 dni</span>` : null,
    p.nick ? `wyslany przez ${esc(p.nick)}` : 'wyslany anonimowo',
  ]
    .filter(Boolean)
    .join(' · ');

  // Position is meaningful only in the ranking; the other sorts have no places.
  const wRankingu = state.sort === 'top' || state.sort === 'gorace';
  const miejsce = wRankingu
    ? `<div class="miejsce ${i < 3 ? 'podium' : ''}">${String(i + 1).padStart(2, '0')}</div>`
    : '';
  const klasy = ['wpis', wRankingu ? '' : 'bez-miejsca', wRankingu && i === 0 ? 'mistrz' : '']
    .filter(Boolean)
    .join(' ');

  return `<li class="${klasy}">
    ${miejsce}
    <div class="tresc">
      <div class="nazwa">${esc(p.wynik)}</div>
      ${role}
      <div class="meta">${meta}</div>
      <button class="raport-link" data-report="${p.id}" ${mojeRaporty().has(p.id) ? 'disabled' : ''}>
        ${mojeRaporty().has(p.id) ? 'zgloszono' : 'zglos'}
      </button>
    </div>
    <div class="glosy">
      <button class="strzalka gora ${moj === 1 ? 'akt' : ''}" data-id="${p.id}" data-dir="1" aria-label="Glosuj za">▲</button>
      <span class="wynik">${p.wynikGlosow}</span>
      <button class="strzalka dol ${moj === -1 ? 'akt' : ''}" data-id="${p.id}" data-dir="-1" aria-label="Glosuj przeciw">▼</button>
    </div>
  </li>`;
}

function render(): void {
  const tabsHtml = (['gorace', 'top', 'nowe', 'losowe'] as Sortowanie[])
    .map(
      (s) =>
        `<button class="tab ${state.sort === s ? 'akt' : ''}" data-sort="${s}">${etykieta(s)}</button>`,
    )
    .join('');
  $('#tabs').innerHTML = tabsHtml;

  const lista = $('#lista');
  if (state.pozycje.length === 0 && !state.ladowanie) {
    lista.innerHTML = `<li class="pusto">
      <strong>Ranking jest pusty</strong>
      Wpisz <code>rkg!</code> w grze i wyslij pierwszy klub.
    </li>`;
  } else {
    lista.innerHTML = state.pozycje.map(wiersz).join('');
  }

  const wiecej = $('#wiecej') as HTMLButtonElement;
  wiecej.hidden = !state.cursor || state.sort === 'losowe';
  wiecej.textContent = state.ladowanie ? 'Ladowanie…' : 'Pokaz wiecej';
  if (!state.ladowanie) $('#blad').textContent = '';
}

function etykieta(s: Sortowanie): string {
  return s === 'gorace'
    ? 'Na czasie'
    : s === 'top'
      ? 'Wszech czasow'
      : s === 'nowe'
        ? 'Najnowsze'
        : 'Losowe';
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function wpiszSort(sort: Sortowanie): void {
  if (sort === state.sort) return;
  state.sort = sort;
  state.cursor = undefined;
  state.pozycje = [];
  pobierz(false);
}

// ── Wiring ──────────────────────────────────────────────────────────────────

document.addEventListener('click', (e) => {
  const el = e.target as HTMLElement;
  const sort = el.closest<HTMLElement>('[data-sort]')?.dataset.sort as Sortowanie | undefined;
  if (sort) return wpiszSort(sort);
  const strzalka = el.closest<HTMLElement>('.strzalka');
  if (strzalka?.dataset.id) {
    glosuj(strzalka.dataset.id, Number(strzalka.dataset.dir) as 1 | -1);
  }
  const report = el.closest<HTMLElement>('[data-report]')?.dataset.report;
  if (report) return otworzRaport(report);
  const reason = el.closest<HTMLElement>('[data-powod]')?.dataset.powod as PowodRaportu | undefined;
  if (reason) return void zglos(reason);
  const adminId = el.closest<HTMLElement>('[data-admin-id]')?.dataset.adminId;
  const action = el.closest<HTMLElement>('[data-admin-action]')?.dataset.adminAction as AkcjaModeracji | undefined;
  if (adminId && action) return void moderuj(adminId, action);
});

$('#wiecej').addEventListener('click', () => pobierz(true));
$('#moderacja-open').addEventListener('click', () => {
  ($('#admin-dialog') as HTMLDialogElement).showModal();
  if (adminKey()) void pobierzModeracje();
});
$('#admin-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const value = ($('#admin-klucz') as HTMLInputElement).value;
  sessionStorage.setItem(KLUCZ_ADMIN, value);
  void pobierzModeracje();
});

pobierz(false);
