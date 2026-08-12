import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('API router boundary', () => {
  it('returns a JSON 404 for unknown API routes', async () => {
    const response = await SELF.fetch('https://rkg.test/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(await response.json()).toEqual({ blad: 'nie znaleziono' });
  });

  it('answers plugin preflight with only the allow-listed origin', async () => {
    const response = await SELF.fetch('https://rkg.test/api/nazwy', {
      method: 'OPTIONS',
      headers: { Origin: 'https://delwing.github.io' },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://delwing.github.io');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-RKG-Admin');
  });
});
