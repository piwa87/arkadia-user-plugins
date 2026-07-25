import type { GlosResponse, ListaResponse, Pozycja, Sortowanie } from '../../src/shared/rkg-api';

/**
 * RKG wall — the public "Sala Chwaly" of generated club names.
 *
 * Static page served by the same Worker that exposes the API, so every call is
 * same-origin. Vote identity is one random id kept in localStorage; there are no
 * accounts.
 */

const KLUCZ_GLOSUJACY = 'rkg:glosujacy';

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
  sort: 'top',
  pozycje: [],
  ladowanie: false,
};

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

async function pobierz(dopisz = false): Promise<void> {
  if (state.ladowanie) return;
  state.ladowanie = true;
  render();

  const params = new URLSearchParams({ sort: state.sort });
  if (dopisz && state.cursor) params.set('cursor', state.cursor);
  try {
    const res = await fetch(`/api/nazwy?${params}`);
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as ListaResponse;
    state.pozycje = dopisz ? [...state.pozycje, ...data.pozycje] : data.pozycje;
    state.cursor = data.cursor;
  } catch {
    if (!dopisz) state.pozycje = [];
    $('#blad').textContent = 'Nie udalo sie pobrac listy. Sprobuj odswiezyc.';
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
    $('#blad').textContent = 'Glos nie przeszedl. Sprobuj ponownie.';
  }
}

function wiersz(p: Pozycja, i: number): string {
  const moj = mojeGlosy()[p.id] ?? 0;
  const role = p.role
    ? `<div class="role">
         ${p.role.przywodca ? `<span>👑 ${esc(p.role.przywodca)}</span>` : ''}
         ${p.role.zastepca ? `<span>🛡️ ${esc(p.role.zastepca)}</span>` : ''}
         ${p.role.czlonek ? `<span>• ${esc(p.role.czlonek)}</span>` : ''}
       </div>`
    : '';
  const meta = [
    p.zgloszenia > 1 ? `${p.zgloszenia}× wygenerowany` : null,
    p.nick ? `od ${esc(p.nick)}` : 'anonim',
  ]
    .filter(Boolean)
    .join(' · ');

  return `<li class="wpis">
    <div class="glosy">
      <button class="strzalka ${moj === 1 ? 'akt' : ''}" data-id="${p.id}" data-dir="1" aria-label="w gore">▲</button>
      <span class="wynik">${p.wynikGlosow}</span>
      <button class="strzalka ${moj === -1 ? 'akt' : ''}" data-id="${p.id}" data-dir="-1" aria-label="w dol">▼</button>
    </div>
    <div class="tresc">
      <div class="nazwa">${state.sort === 'top' ? `<span class="rank">#${i + 1}</span>` : ''}${esc(p.wynik)}</div>
      ${role}
      <div class="meta">${meta}</div>
    </div>
  </li>`;
}

function render(): void {
  const tabsHtml = (['top', 'nowe', 'losowe'] as Sortowanie[])
    .map(
      (s) =>
        `<button class="tab ${state.sort === s ? 'akt' : ''}" data-sort="${s}">${etykieta(s)}</button>`,
    )
    .join('');
  $('#tabs').innerHTML = tabsHtml;

  const lista = $('#lista');
  if (state.pozycje.length === 0 && !state.ladowanie) {
    lista.innerHTML = `<li class="pusto">Jeszcze pusto. Wygeneruj klub w grze i wyslij go!</li>`;
  } else {
    lista.innerHTML = state.pozycje.map(wiersz).join('');
  }

  const wiecej = $('#wiecej') as HTMLButtonElement;
  wiecej.hidden = !state.cursor || state.sort === 'losowe';
  wiecej.textContent = state.ladowanie ? 'Ladowanie…' : 'Pokaz wiecej';
  if (!state.ladowanie) $('#blad').textContent = '';
}

function etykieta(s: Sortowanie): string {
  return s === 'top' ? 'Najlepsze' : s === 'nowe' ? 'Najnowsze' : 'Losowe';
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
});

$('#wiecej').addEventListener('click', () => pobierz(true));

pobierz(false);
