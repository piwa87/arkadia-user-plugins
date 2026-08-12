import { describe, expect, it } from 'vitest';
import type { Pozycja, PozycjaModeracji, WpisHistoriiModeracji } from '../../src/shared/rkg-api';
import {
  filterModeration,
  moderationHistory,
  moderationRows,
  moderationTabs,
} from '../../web/src/moderation';
import { rankingRow } from '../../web/src/ranking';

const entry: Pozycja = {
  id: 'club-0001',
  wynik: 'Bractwo <script>',
  wynikGlosow: 7,
  wynikOkresu: 2,
  zgloszenia: 3,
  nick: 'Gracz & Spolka',
  kiedy: 123,
  role: { przywodca: 'Pierwszy', zastepca: 'Drugi', czlonek: 'Brat' },
};

describe('ranking row view', () => {
  it('renders ranking state and escapes public club data', () => {
    const html = rankingRow(entry, 0, 'gorace', 1, true);

    expect(html).toContain('miejsce podium');
    expect(html).toContain('strzalka gora akt');
    expect(html).toContain('zgloszono');
    expect(html).toContain('Bractwo &#60;script&#62;');
    expect(html).toContain('Gracz &#38; Spolka');
    expect(html).not.toContain('<script>');
  });

  it('does not invent a ranking position for newest and random views', () => {
    expect(rankingRow(entry, 0, 'nowe', 0, false)).not.toContain('miejsce podium');
    expect(rankingRow(entry, 0, 'losowe', 0, false)).toContain('bez-miejsca');
  });

  it('locks both vote buttons while that club is being updated', () => {
    const html = rankingRow(entry, 0, 'top', 0, false, true);

    expect(html).toContain('aria-busy="true"');
    expect(html.match(/disabled/g)).toHaveLength(2);
  });
});

describe('moderation view', () => {
  it('renders report counts and the correct action for hidden clubs', () => {
    const moderated: PozycjaModeracji = {
      ...entry,
      ukryte: true,
      raporty: 4,
      raportyPowody: { wulgarne: 2, osoba: 1, inne: 1 },
    };

    const html = moderationRows([moderated]);

    expect(html).toContain('UKRYTY');
    expect(html).toContain('data-admin-action="przywroc"');
    expect(html).toContain('data-admin-action="odrzuc"');
    expect(html).toContain('wulgarne 2 · osoba 1 · inne 1');
    expect(html).not.toContain('<script>');
  });

  it('locks moderation controls while that club is being updated', () => {
    const moderated: PozycjaModeracji = {
      ...entry,
      ukryte: false,
      raporty: 0,
      raportyPowody: { wulgarne: 0, osoba: 0, inne: 0 },
    };

    const html = moderationRows([moderated], new Set([moderated.id]));

    expect(html).toContain('aria-busy="true"');
    expect(html.match(/disabled/g)).toHaveLength(2);
  });

  it('filters the actionable and hidden queues and shows their counts', () => {
    const reported: PozycjaModeracji = {
      ...entry,
      ukryte: false,
      raporty: 2,
      raportyPowody: { wulgarne: 1, osoba: 0, inne: 1 },
    };
    const hidden: PozycjaModeracji = {
      ...entry,
      id: 'club-hidden',
      ukryte: true,
      raporty: 0,
      raportyPowody: { wulgarne: 0, osoba: 0, inne: 0 },
    };

    expect(filterModeration([reported, hidden], 'zgloszone')).toEqual([reported]);
    expect(filterModeration([reported, hidden], 'ukryte')).toEqual([hidden]);
    const tabs = moderationTabs('zgloszone', [reported, hidden], 4);
    expect(tabs).toContain('Zgłoszone <span>1</span>');
    expect(tabs).toContain('Ukryte <span>1</span>');
    expect(tabs).toContain('Historia <span>4</span>');
    expect(tabs).toContain('data-admin-view="zgloszone" aria-pressed="true"');
  });

  it('renders escaped, permanent moderation history snapshots', () => {
    const history: WpisHistoriiModeracji = {
      id: 'history-1',
      nazwaId: entry.id,
      wynik: 'Usunięty <script>',
      akcja: 'usun',
      raporty: 3,
      kiedy: 1_700_000_000_000,
    };

    const html = moderationHistory([history]);
    expect(html).toContain('Usunięto');
    expect(html).toContain('Usunięty &#60;script&#62;');
    expect(html).toContain('raporty: 3');
    expect(html).not.toContain('<script>');
  });
});
