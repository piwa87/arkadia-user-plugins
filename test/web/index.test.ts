import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../web/src/index.html', import.meta.url), 'utf8');
const mockClubs = JSON.parse(
  readFileSync(new URL('../../web/dev/mock-clubs.json', import.meta.url), 'utf8'),
) as Array<{ id: string; wynik: string; wynikGlosow: number }>;

describe('RKG ranking page', () => {
  it('puts the daily upload limit before the ranking controls', () => {
    const limit = html.indexOf('class="limit-dzienny"');
    const tabs = html.indexOf('id="tabs"');

    expect(limit).toBeGreaterThan(0);
    expect(limit).toBeLessThan(tabs);
    expect(html).toContain('Jeden klub. Raz na 24 godziny.');
    expect(html).toContain('Każde wysłanie zużywa jedyny dostępny slot.');
  });

  it('explains the complete setup and publishing flow before the ranking', () => {
    const instrukcja = html.indexOf('class="jak-dziala"');
    const tabs = html.indexOf('id="tabs"');

    expect(instrukcja).toBeGreaterThan(0);
    expect(instrukcja).toBeLessThan(tabs);
    expect(html).toContain('https://piwa87.github.io/arkadia-user-plugins/rkg-plugin.js');
    expect(html).toContain('Wpisz <code>rkg!</code>');
    expect(html).toContain('anuluje je na ostatnim kroku');
    expect(html).toContain('czy wysłać klub do rankingu');
  });

  it('ships ten distinct clubs for the local preview', () => {
    expect(mockClubs).toHaveLength(10);
    expect(new Set(mockClubs.map((club) => club.id)).size).toBe(10);
    expect(mockClubs.every((club) => club.wynik && Number.isFinite(club.wynikGlosow))).toBe(true);
  });
});
