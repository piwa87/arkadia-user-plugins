import type { Pozycja, Sortowanie } from '../../src/shared/rkg-api';
import { apiErrorMessage, fetchRanking, submitVote } from './api';
import { element, escapeHtml } from './dom';
import { ownReports, ownVotes, rememberVote, voterId } from './local-state';
import { mozeDopisac, scal } from './lista';

interface RankingState {
  sort: Sortowanie;
  cursor?: string;
  pozycje: Pozycja[];
  ladowanie: boolean;
  oczekujaceGlosy: Set<string>;
  blad: string;
}

export interface Ranking {
  load(append?: boolean): Promise<void>;
  vote(id: string, direction: 1 | -1): Promise<void>;
  changeSort(sort: Sortowanie): void;
  find(id: string): Pozycja | undefined;
  render(): void;
}

function role(icon: string, title: string | undefined, className = ''): string {
  if (!title) return '';
  return `<div class="rola ${className}"><span class="ikona" aria-hidden="true">${icon}</span><span>${escapeHtml(title)}</span></div>`;
}

export function rankingRow(
  entry: Pozycja,
  index: number,
  sort: Sortowanie,
  ownVote: number,
  reported: boolean,
  voting = false,
): string {
  const roles = entry.role
    ? `<div class="role">
         ${role('👑', entry.role.przywodca, 'szef')}
         ${role('🛡️', entry.role.zastepca)}
         ${role('⚔️', entry.role.czlonek)}
       </div>`
    : '';
  const meta = [
    entry.zgloszenia > 1 ? `<span class="licznik">${entry.zgloszenia}× wylosowany</span>` : null,
    entry.wynikOkresu != null
      ? `<span class="trend">${entry.wynikOkresu >= 0 ? '+' : ''}${entry.wynikOkresu} / 7 dni</span>`
      : null,
    entry.nick ? `wyslany przez ${escapeHtml(entry.nick)}` : 'wyslany anonimowo',
  ].filter(Boolean).join(' · ');

  const ranked = sort === 'top' || sort === 'gorace';
  const place = ranked
    ? `<div class="miejsce ${index < 3 ? 'podium' : ''}">${String(index + 1).padStart(2, '0')}</div>`
    : '';
  const classes = ['wpis', ranked ? '' : 'bez-miejsca', ranked && index === 0 ? 'mistrz' : '']
    .filter(Boolean)
    .join(' ');

  return `<li class="${classes}">
    ${place}
    <div class="tresc">
      <div class="nazwa">${escapeHtml(entry.wynik)}</div>
      ${roles}
      <div class="meta">${meta}</div>
      <button class="raport-link" data-report="${entry.id}" ${reported ? 'disabled' : ''}>
        ${reported ? 'zgloszono' : 'zglos'}
      </button>
    </div>
    <div class="glosy" ${voting ? 'aria-busy="true"' : ''}>
      <button class="strzalka gora ${ownVote === 1 ? 'akt' : ''}" data-id="${entry.id}" data-dir="1" aria-label="Glosuj za" ${voting ? 'disabled' : ''}>▲</button>
      <span class="wynik">${entry.wynikGlosow}</span>
      <button class="strzalka dol ${ownVote === -1 ? 'akt' : ''}" data-id="${entry.id}" data-dir="-1" aria-label="Glosuj przeciw" ${voting ? 'disabled' : ''}>▼</button>
    </div>
  </li>`;
}

function label(sort: Sortowanie): string {
  return sort === 'gorace'
    ? 'Na czasie'
    : sort === 'top'
      ? 'Wszech czasow'
      : sort === 'nowe'
        ? 'Najnowsze'
        : 'Losowe';
}

export function createRanking(): Ranking {
  const state: RankingState = {
    sort: 'gorace',
    pozycje: [],
    ladowanie: false,
    oczekujaceGlosy: new Set(),
    blad: '',
  };

  function render(): void {
    element('#tabs').innerHTML = (['gorace', 'top', 'nowe', 'losowe'] as Sortowanie[])
      .map((sort) => `<button class="tab ${state.sort === sort ? 'akt' : ''}" data-sort="${sort}">${label(sort)}</button>`)
      .join('');

    const list = element('#lista');
    if (state.pozycje.length === 0 && !state.ladowanie) {
      list.innerHTML = `<li class="pusto">
        <strong>Ranking jest pusty</strong>
        Wpisz <code>rkg!</code> w grze i wyslij pierwszy klub.
      </li>`;
    } else {
      const votes = ownVotes();
      const reports = ownReports();
      list.innerHTML = state.pozycje
        .map((entry, index) => rankingRow(
          entry,
          index,
          state.sort,
          votes[entry.id] ?? 0,
          reports.has(entry.id),
          state.oczekujaceGlosy.has(entry.id),
        ))
        .join('');
    }

    const more = element<HTMLButtonElement>('#wiecej');
    more.hidden = !state.cursor || state.sort === 'losowe';
    more.textContent = state.ladowanie ? 'Ladowanie…' : 'Pokaz wiecej';
    element('#blad').textContent = state.blad;
  }

  async function load(append = false): Promise<void> {
    if (state.ladowanie || (append && !mozeDopisac(state.cursor, state.ladowanie))) return;
    state.ladowanie = true;
    state.blad = '';
    render();
    try {
      const data = await fetchRanking(state.sort, append ? state.cursor : undefined);
      state.pozycje = append ? scal(state.pozycje, data.pozycje) : data.pozycje;
      state.cursor = data.cursor;
    } catch {
      if (!append) state.pozycje = [];
      state.blad = 'Nie udało się pobrać listy. Odśwież stronę.';
    } finally {
      state.ladowanie = false;
      render();
    }
  }

  async function vote(id: string, direction: 1 | -1): Promise<void> {
    if (state.oczekujaceGlosy.has(id)) return;
    const current = ownVotes()[id] ?? 0;
    const value: 1 | -1 | 0 = current === direction ? 0 : direction;
    state.oczekujaceGlosy.add(id);
    state.blad = '';
    render();
    try {
      const data = await submitVote(id, voterId(), value);
      const entry = state.pozycje.find((item) => item.id === id);
      if (entry) entry.wynikGlosow = data.wynikGlosow;
      rememberVote(id, value);
      render();
    } catch (error) {
      state.blad = apiErrorMessage(
        error,
        'Głos nie doszedł. Kliknij jeszcze raz.',
      );
    } finally {
      state.oczekujaceGlosy.delete(id);
      render();
    }
  }

  function changeSort(sort: Sortowanie): void {
    if (sort === state.sort) return;
    state.sort = sort;
    state.cursor = undefined;
    state.pozycje = [];
    void load(false);
  }

  return {
    load,
    vote,
    changeSort,
    find: (id) => state.pozycje.find((entry) => entry.id === id),
    render,
  };
}
