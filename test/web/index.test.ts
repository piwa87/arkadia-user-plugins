import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../web/src/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../web/src/styles.css', import.meta.url), 'utf8');
const mockClubs = JSON.parse(
  readFileSync(new URL('../../web/dev/mock-clubs.json', import.meta.url), 'utf8'),
) as Array<{ id: string; wynik: string; wynikGlosow: number }>;

describe('RKG ranking page', () => {
  it('keeps page structure and styling in separate source files', () => {
    expect(html).toContain('href="./styles.css"');
    expect(html).not.toContain('<style>');
    expect(css).toContain('.tytul');
    expect(css).toContain('font-size: clamp(2.55rem, 10.5vw, 4.85rem)');
    expect(css).toContain('line-height: 1.04');
  });

  it('puts the daily upload limit before the ranking controls', () => {
    const limit = html.indexOf('class="limit-dzienny"');
    const tabs = html.indexOf('id="tabs"');

    expect(limit).toBeGreaterThan(0);
    expect(limit).toBeLessThan(tabs);
    expect(html).toContain('Jeden klub. Raz na 24 godziny.');
    expect(html).toContain('Każde wysłanie zużywa jedyny dostępny slot.');
  });

  it('uses correct Polish copy and keeps each footer action on its own line', () => {
    expect(html).toContain('Ranking najbardziej zwałowych klubów');
    expect(html).toContain('<p>Wylosuj klub w grze aliasem <code>rkg!</code>.</p>');
    expect(html).toContain('<p>Do rankingu możesz wysłać jeden klub na 24 godziny.</p>');
    expect(html).toContain('class="stopka-przycisk">Moderejszyn</button>');
    expect(html).not.toContain('godziny.\n        ·');
  });

  it('explains the complete setup and publishing flow before the ranking', () => {
    const instrukcja = html.indexOf('class="jak-dziala"');
    const tabs = html.indexOf('id="tabs"');

    expect(instrukcja).toBeGreaterThan(0);
    expect(instrukcja).toBeLessThan(tabs);
    const installHref = html.match(/class="plugin-link" href="([^"]+)"/)?.[1];
    expect(installHref).toBeTruthy();
    const installUrl = new URL(installHref!);
    expect(installUrl.origin).toBe('https://delwing.github.io');
    expect(installUrl.pathname).toBe('/arkadia-web-client-extension/');
    expect(installUrl.searchParams.get('add-script')).toBe(
      'https://piwa87.github.io/arkadia-user-plugins/rkg-plugin.js',
    );
    expect(html).toContain('Otwórz klienta i dodaj RKG');
    expect(html).toContain('Wpisz <code>rkg!</code>');
    expect(html).toContain('anuluje je na ostatnim kroku');
    expect(html).toContain('czy wysłać klub do rankingu');
  });

  it('ships ten distinct clubs for the local preview', () => {
    expect(mockClubs).toHaveLength(10);
    expect(new Set(mockClubs.map((club) => club.id)).size).toBe(10);
    expect(mockClubs.every((club) => club.wynik && Number.isFinite(club.wynikGlosow))).toBe(true);
  });

  it('ships fixed-reason reporting and a protected backstage moderation panel', () => {
    expect(html).toContain('id="raport-dialog"');
    expect(html).toContain('data-powod="wulgarne"');
    expect(html).toContain('data-powod="osoba"');
    expect(html).toContain('data-powod="inne"');
    expect(html).not.toContain('<textarea');
    expect(html).toContain('id="admin-dialog"');
    expect(html).toContain('id="admin-tabs"');
    expect(html).toContain('type="password"');
    expect(html).toContain('Backstage');
  });
});
