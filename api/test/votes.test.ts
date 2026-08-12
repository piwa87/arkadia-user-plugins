import { describe, expect, it, vi } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import type { BladResponse, GlosResponse } from '../../src/shared/rkg-api';
import { zapiszGlos } from '../src/votes';

const DB = (env as unknown as { DB: D1Database }).DB;
const CLUB_ID = 'club-votes-0001';

async function insertClub(): Promise<void> {
  await DB.prepare(
    `INSERT INTO nazwy
       (id, klucz, wynik, typ, przymiotnik, rzeczownik, liczba, przypadek, kiedy)
     VALUES (?, ?, ?, 'liga', 'pokretny', 'zmora', 'mnogiej', 'dopelniaczu', ?)`,
  ).bind(CLUB_ID, CLUB_ID, 'Liga Pokretnych Zmor', Date.now()).run();
}

function vote(glosujacy: string, wartosc: 1 | -1 | 0): Promise<Response> {
  return SELF.fetch(`https://rkg.test/api/nazwy/${CLUB_ID}/glos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ glosujacy, wartosc }),
  });
}

describe('RKG atomic voting', () => {
  it('keeps the vote row and cached score in sync when a vote changes or is withdrawn', async () => {
    await insertClub();

    expect((await vote('device-vote-change', 1)).status).toBe(200);
    const changed = await vote('device-vote-change', -1);
    expect(await changed.json<GlosResponse>()).toEqual({ id: CLUB_ID, wynikGlosow: -1 });

    const withdrawn = await vote('device-vote-change', 0);
    expect(await withdrawn.json<GlosResponse>()).toEqual({ id: CLUB_ID, wynikGlosow: 0 });
    expect(await DB.prepare('SELECT 1 FROM glosy WHERE nazwa_id = ?').bind(CLUB_ID).first())
      .toBeNull();
    expect(await DB.prepare('SELECT wynik_glosow FROM nazwy WHERE id = ?')
      .bind(CLUB_ID)
      .first<{ wynik_glosow: number }>())
      .toEqual({ wynik_glosow: 0 });
  });

  it('serializes concurrent votes without leaving a stale cached score', async () => {
    await insertClub();
    const voters = Array.from({ length: 20 }, (_, index) => `device-concurrent-${index}`);

    const responses = await Promise.all(voters.map((id) => vote(id, 1)));
    expect(responses.every((response) => response.status === 200)).toBe(true);

    const rows = await DB.prepare('SELECT COUNT(*) AS count FROM glosy WHERE nazwa_id = ?')
      .bind(CLUB_ID)
      .first<{ count: number }>();
    const club = await DB.prepare('SELECT wynik_glosow FROM nazwy WHERE id = ?')
      .bind(CLUB_ID)
      .first<{ wynik_glosow: number }>();
    expect(rows?.count).toBe(20);
    expect(club?.wynik_glosow).toBe(20);
  });

  it('lets only one concurrent request consume the final rate-limit slot', async () => {
    await insertClub();
    const now = Date.now();
    const results = await Promise.all([
      zapiszGlos(DB, CLUB_ID, 'device-final-slot', 1, 1, now),
      zapiszGlos(DB, CLUB_ID, 'device-final-slot', -1, 1, now),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(['limit', 'zapisany']);
    const events = await DB.prepare(
      "SELECT COUNT(*) AS count FROM zdarzenia WHERE glosujacy = ? AND rodzaj = 'glos'",
    ).bind('device-final-slot').first<{ count: number }>();
    expect(events?.count).toBe(1);
  });

  it('does not consume a rate-limit slot for a missing club', async () => {
    const response = await vote('device-missing-club', 1);

    expect(response.status).toBe(404);
    const events = await DB.prepare(
      "SELECT COUNT(*) AS count FROM zdarzenia WHERE glosujacy = ? AND rodzaj = 'glos'",
    ).bind('device-missing-club').first<{ count: number }>();
    expect(events?.count).toBe(0);
  });

  it('rolls back the rate-limit slot when saving the vote fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await insertClub();
    await DB.prepare('DROP TABLE glosy').run();

    const response = await vote('device-vote-rollback', 1);
    expect(response.status).toBe(500);
    expect((await response.json<BladResponse>()).blad).toBe('blad serwera');

    const events = await DB.prepare(
      "SELECT COUNT(*) AS count FROM zdarzenia WHERE glosujacy = ? AND rodzaj = 'glos'",
    ).bind('device-vote-rollback').first<{ count: number }>();
    expect(events?.count).toBe(0);
  });
});
