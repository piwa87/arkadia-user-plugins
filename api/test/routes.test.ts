import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { HealthResponse } from '../../src/shared/rkg-api';

describe('API router boundary', () => {
  it('checks the Worker and its D1 binding', async () => {
    const response = await SELF.fetch('https://rkg.test/api/health');

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json<HealthResponse>()).toEqual({ status: 'ok', database: 'ok' });
  });

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
