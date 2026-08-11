import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../../web/src/index.html', import.meta.url), 'utf8');

describe('RKG ranking page', () => {
  it('puts the daily upload limit before the ranking controls', () => {
    const limit = html.indexOf('class="limit-dzienny"');
    const tabs = html.indexOf('id="tabs"');

    expect(limit).toBeGreaterThan(0);
    expect(limit).toBeLessThan(tabs);
    expect(html).toContain('Jeden klub. Raz na 24 godziny.');
    expect(html).toContain('Każde wysłanie zużywa jedyny dostępny slot.');
  });
});
