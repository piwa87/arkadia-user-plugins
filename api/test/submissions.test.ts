import { describe, expect, it, vi } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import type { BladResponse, StatusLimitu, ZgloszenieRequest, ZgloszenieResponse } from '../../src/shared/rkg-api';

const DB = (env as unknown as { DB: D1Database }).DB;

function submission(
  glosujacy: string,
  overrides: Partial<ZgloszenieRequest> = {},
): ZgloszenieRequest {
  return {
    typ: 'liga',
    przymiotnik: 'pokretny',
    rzeczownik: 'zmora',
    liczba: 'mnogiej',
    przypadek: 'dopelniaczu',
    wynik: 'Liga Pokretnych Zmor',
    glosujacy,
    ...overrides,
  };
}

function post(path: string, body: unknown, network = '198.51.100.10'): Promise<Response> {
  return SELF.fetch(`https://rkg.test${path}`, {
    method: 'POST',
    headers: { 'CF-Connecting-IP': network, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('RKG submission and daily-slot integration', () => {
  it('reports, consumes and then counts down the authoritative slot', async () => {
    const id = 'device-integration-1';
    const before = await post('/api/limit', { glosujacy: id });
    expect(before.status).toBe(200);
    expect(await before.json<StatusLimitu>()).toEqual({ dostepny: true, ponownieZaMs: 0 });

    const uploaded = await post('/api/nazwy', submission(id));
    expect(uploaded.status).toBe(201);
    const accepted = await uploaded.json<ZgloszenieResponse>();
    expect(accepted.duplikat).toBe(false);
    expect(accepted.limit).toEqual({ dostepny: false, ponownieZaMs: 86_400_000 });

    const after = await post('/api/limit', { glosujacy: id });
    expect(after.status).toBe(200);
    const limit = await after.json<StatusLimitu>();
    expect(limit.dostepny).toBe(false);
    expect(limit.ponownieZaMs).toBeGreaterThan(86_390_000);
    expect(limit.ponownieZaMs).toBeLessThanOrEqual(86_400_000);
  });

  it('lets only one of two concurrent requests reserve a device slot', async () => {
    const id = 'device-concurrent-1';
    const responses = await Promise.all([
      post('/api/nazwy', submission(id)),
      post('/api/nazwy', submission(id, { wynik: 'Liga Pokretnych Widm', rzeczownik: 'widmo' })),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 429]);
    const denied = responses.find((response) => response.status === 429)!;
    const error = await denied.json<BladResponse>();
    expect(error.limit?.dostepny).toBe(false);
    expect(error.limit?.ponownieZaMs).toBeGreaterThan(0);

    const names = await DB.prepare('SELECT COUNT(*) AS count FROM nazwy').first<{ count: number }>();
    const claims = await DB.prepare(
      "SELECT COUNT(*) AS count FROM zdarzenia WHERE rodzaj = 'zgloszenie'",
    ).first<{ count: number }>();
    expect(names?.count).toBe(1);
    expect(claims?.count).toBe(1);
  });

  it('deduplicates the same club from different devices and counts both submissions', async () => {
    const responses = await Promise.all([
      post('/api/nazwy', submission('device-dedup-one'), '198.51.100.20'),
      post('/api/nazwy', submission('device-dedup-two'), '198.51.100.21'),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 201]);
    const bodies = await Promise.all(responses.map((response) => response.json<ZgloszenieResponse>()));
    expect(bodies.filter((body) => body.duplikat)).toHaveLength(1);
    expect(new Set(bodies.map((body) => body.id))).toHaveLength(1);

    const name = await DB.prepare('SELECT zgloszenia FROM nazwy').first<{ zgloszenia: number }>();
    const claims = await DB.prepare(
      "SELECT COUNT(*) AS count FROM zdarzenia WHERE rodzaj = 'zgloszenie'",
    ).first<{ count: number }>();
    expect(name?.zgloszenia).toBe(2);
    expect(claims?.count).toBe(2);
  });

  it('rejects a new installation id on a network that already used its slot', async () => {
    const network = '198.51.100.30';
    const first = await post('/api/nazwy', submission('device-network-original'), network);
    const resetStorage = await post(
      '/api/nazwy',
      submission('device-network-after-storage-reset', {
        wynik: 'Liga Pokretnych Widm',
        rzeczownik: 'widmo',
      }),
      network,
    );

    expect(first.status).toBe(201);
    expect(resetStorage.status).toBe(429);
    expect((await resetStorage.json<BladResponse>()).limit?.dostepny).toBe(false);
  });

  it('still rejects the same installation after it changes networks', async () => {
    const id = 'device-after-network-change';
    const first = await post('/api/nazwy', submission(id), '198.51.100.40');
    const changedNetwork = await post(
      '/api/nazwy',
      submission(id, { wynik: 'Liga Pokretnych Widm', rzeczownik: 'widmo' }),
      '203.0.113.40',
    );

    expect(first.status).toBe(201);
    expect(changedNetwork.status).toBe(429);
  });

  it('lets only one of two concurrent installations reserve a network slot', async () => {
    const network = '198.51.100.50';
    const responses = await Promise.all([
      post('/api/nazwy', submission('device-network-race-one'), network),
      post(
        '/api/nazwy',
        submission('device-network-race-two', {
          wynik: 'Liga Pokretnych Widm',
          rzeczownik: 'widmo',
        }),
        network,
      ),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 429]);
    const claims = await DB.prepare(
      "SELECT COUNT(*) AS count FROM zdarzenia WHERE rodzaj = 'zgloszenie'",
    ).first<{ count: number }>();
    expect(claims?.count).toBe(1);
  });

  it('includes the network reservation in status without storing the raw address', async () => {
    const network = '198.51.100.60';
    await post('/api/nazwy', submission('device-network-status-one'), network);

    const status = await post('/api/limit', { glosujacy: 'device-network-status-two' }, network);
    expect(status.status).toBe(200);
    expect((await status.json<StatusLimitu>()).dostepny).toBe(false);

    const reservation = await DB.prepare(
      "SELECT siec FROM zdarzenia WHERE rodzaj = 'zgloszenie'",
    ).first<{ siec: string }>();
    expect(reservation?.siec).toMatch(/^[0-9a-f]{64}$/);
    expect(reservation?.siec).not.toContain(network);
  });

  it('reopens both parts of the slot after the rolling 24-hour window', async () => {
    const network = '198.51.100.61';
    const firstId = 'device-expired-original';
    await post('/api/nazwy', submission(firstId), network);
    await DB.prepare("UPDATE zdarzenia SET kiedy = ? WHERE rodzaj = 'zgloszenie'")
      .bind(Date.now() - 86_400_001)
      .run();

    const resetStorage = await post(
      '/api/limit',
      { glosujacy: 'device-expired-after-storage-reset' },
      network,
    );
    const changedNetwork = await post('/api/limit', { glosujacy: firstId }, '203.0.113.61');

    expect(await resetStorage.json<StatusLimitu>()).toEqual({ dostepny: true, ponownieZaMs: 0 });
    expect(await changedNetwork.json<StatusLimitu>()).toEqual({ dostepny: true, ponownieZaMs: 0 });
  });

  it('rolls the slot reservation back and hides internal errors if saving fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await DB.prepare('DROP TABLE nazwy').run();

    const response = await post('/api/nazwy', submission('device-rollback-1'));
    expect(response.status).toBe(500);
    const error = await response.json<BladResponse>();
    expect(error.blad).toBe('blad serwera');
    expect(error.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(JSON.stringify(error)).not.toContain('no such table');

    const claims = await DB.prepare(
      "SELECT COUNT(*) AS count FROM zdarzenia WHERE rodzaj = 'zgloszenie'",
    ).first<{ count: number }>();
    expect(claims?.count).toBe(0);
  });
});
