import { describe, expect, it, vi } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import type {
  BladResponse,
  ListaModeracjiResponse,
  ListaResponse,
  ModeracjaResponse,
  RaportResponse,
} from '../../src/shared/rkg-api';

const DB = (env as unknown as { DB: D1Database }).DB;
const ADMIN = 'test-admin-key';

function request(path: string, method = 'GET', body?: unknown, admin?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (admin !== undefined) headers['X-RKG-Admin'] = admin;
  return SELF.fetch(`https://rkg.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function seedName(id: string, score = 0, when = Date.now()): Promise<void> {
  await DB.prepare(
    `INSERT INTO nazwy
      (id, klucz, wynik, typ, przymiotnik, rzeczownik, liczba, przypadek,
       wynik_glosow, kiedy)
     VALUES (?, ?, ?, 'liga', 'pokretny', 'zmora', 'mnogiej', 'dopelniaczu', ?, ?)`,
  ).bind(id, `key-${id}`, `Liga ${id}`, score, when).run();
}

describe('public reports', () => {
  it('accepts concurrent duplicate reports idempotently without spending two rate slots', async () => {
    await seedName('club-0001');
    const body = { glosujacy: 'reporter-device-1', powod: 'wulgarne' };

    const responses = await Promise.all([
      request('/api/nazwy/club-0001/raport', 'POST', body),
      request('/api/nazwy/club-0001/raport', 'POST', body),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 201]);
    const bodies = await Promise.all(responses.map((response) => response.json<RaportResponse>()));
    expect(bodies.filter((body) => body.duplikat)).toHaveLength(1);
    const reports = await DB.prepare('SELECT COUNT(*) AS count FROM raporty').first<{ count: number }>();
    const slots = await DB.prepare(
      "SELECT COUNT(*) AS count FROM zdarzenia WHERE rodzaj = 'raport'",
    ).first<{ count: number }>();
    expect(reports?.count).toBe(1);
    expect(slots?.count).toBe(1);
  });

  it('rejects free-form reasons and reports for hidden clubs', async () => {
    await seedName('club-0002');
    const invalid = await request('/api/nazwy/club-0002/raport', 'POST', {
      glosujacy: 'reporter-device-2',
      powod: 'my own long complaint',
    });
    expect(invalid.status).toBe(400);

    await request('/api/admin/nazwy/club-0002', 'POST', { akcja: 'ukryj' }, ADMIN);
    const hidden = await request('/api/nazwy/club-0002/raport', 'POST', {
      glosujacy: 'reporter-device-2',
      powod: 'inne',
    });
    expect(hidden.status).toBe(404);
  });

  it('allows at most ten distinct reports per installation per hour', async () => {
    for (let i = 0; i < 11; i++) await seedName(`club-${String(i).padStart(4, '0')}`);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const response = await request(
        `/api/nazwy/club-${String(i).padStart(4, '0')}/raport`,
        'POST',
        { glosujacy: 'reporter-rate-limit', powod: 'inne' },
      );
      statuses.push(response.status);
      if (i === 10) {
        const error = await response.json<BladResponse>();
        expect(error.ponownieZaMs).toBeGreaterThan(0);
      }
    }
    expect(statuses.slice(0, 10).every((status) => status === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('protected per-club moderation', () => {
  it('requires the admin secret and shows report counts only to the admin', async () => {
    await seedName('club-1001');
    await seedName('club-newer-unreported', 0, Date.now() + 1_000);
    await request('/api/nazwy/club-1001/raport', 'POST', {
      glosujacy: 'reporter-admin-list',
      powod: 'osoba',
    });

    expect((await request('/api/admin/nazwy')).status).toBe(403);
    expect((await request('/api/admin/nazwy', 'GET', undefined, 'wrong')).status).toBe(403);
    expect((await request(
      '/api/admin/nazwy/club-1001',
      'POST',
      { akcja: 'ukryj' },
      'wrong',
    )).status).toBe(403);
    const stillVisible = await DB.prepare('SELECT ukryte FROM nazwy WHERE id = ?')
      .bind('club-1001')
      .first<{ ukryte: number }>();
    expect(stillVisible?.ukryte).toBe(0);
    const response = await request('/api/admin/nazwy', 'GET', undefined, ADMIN);
    expect(response.status).toBe(200);
    const list = await response.json<ListaModeracjiResponse>();
    expect(list.pozycje[0].id).toBe('club-1001');
    expect(list.historia).toEqual([]);
    expect(list.pozycje[0]).toMatchObject({
      id: 'club-1001',
      raporty: 1,
      raportyPowody: { wulgarne: 0, osoba: 1, inne: 0 },
      ukryte: false,
    });
  });

  it('hides, restores and permanently deletes one club while retaining its history', async () => {
    await seedName('club-1002');
    await seedName('club-1003');
    await DB.prepare(
      'INSERT INTO glosy (nazwa_id, glosujacy, wartosc, kiedy) VALUES (?, ?, 1, ?)',
    ).bind('club-1002', 'voter-delete-test', Date.now()).run();
    await request('/api/nazwy/club-1002/raport', 'POST', {
      glosujacy: 'reporter-delete-test',
      powod: 'inne',
    });

    const hidden = await request('/api/admin/nazwy/club-1002', 'POST', { akcja: 'ukryj' }, ADMIN);
    expect(await hidden.json<ModeracjaResponse>()).toMatchObject({ akcja: 'ukryj' });
    let publicList = await (await request('/api/nazwy?sort=nowe')).json<ListaResponse>();
    expect(publicList.pozycje.map((item) => item.id)).toEqual(['club-1003']);

    await request('/api/admin/nazwy/club-1002', 'POST', { akcja: 'przywroc' }, ADMIN);
    publicList = await (await request('/api/nazwy?sort=nowe')).json<ListaResponse>();
    expect(publicList.pozycje.map((item) => item.id)).toContain('club-1002');

    await request('/api/admin/nazwy/club-1002', 'POST', { akcja: 'usun' }, ADMIN);
    expect((await DB.prepare('SELECT id FROM nazwy WHERE id = ?').bind('club-1002').first())).toBeNull();
    expect((await DB.prepare('SELECT 1 FROM glosy WHERE nazwa_id = ?').bind('club-1002').first())).toBeNull();
    expect((await DB.prepare('SELECT 1 FROM raporty WHERE nazwa_id = ?').bind('club-1002').first())).toBeNull();
    const historyResponse = await request('/api/admin/nazwy', 'GET', undefined, ADMIN);
    const history = (await historyResponse.json<ListaModeracjiResponse>()).historia
      .filter((entry) => entry.nazwaId === 'club-1002');
    expect(history.map((entry) => entry.akcja)).toEqual(expect.arrayContaining([
      'ukryj',
      'przywroc',
      'usun',
    ]));
    expect(history.every((entry) => entry.wynik === 'Liga club-1002')).toBe(true);
    expect(history.find((entry) => entry.akcja === 'usun')?.raporty).toBe(1);
    expect((await request('/api/nazwy', 'DELETE')).status).toBe(404);
  });

  it('dismisses reports without hiding the club and records what was reviewed', async () => {
    await seedName('club-1004');
    await request('/api/nazwy/club-1004/raport', 'POST', {
      glosujacy: 'reporter-dismiss-one',
      powod: 'wulgarne',
    });
    await request('/api/nazwy/club-1004/raport', 'POST', {
      glosujacy: 'reporter-dismiss-two',
      powod: 'inne',
    });

    const dismissed = await request(
      '/api/admin/nazwy/club-1004',
      'POST',
      { akcja: 'odrzuc' },
      ADMIN,
    );
    expect(await dismissed.json<ModeracjaResponse>()).toEqual({
      id: 'club-1004',
      akcja: 'odrzuc',
    });
    expect(await DB.prepare('SELECT COUNT(*) AS count FROM raporty WHERE nazwa_id = ?')
      .bind('club-1004').first<{ count: number }>()).toEqual({ count: 0 });
    expect(await DB.prepare('SELECT ukryte FROM nazwy WHERE id = ?')
      .bind('club-1004').first<{ ukryte: number }>()).toEqual({ ukryte: 0 });
    expect(await DB.prepare(
      'SELECT akcja, raporty FROM historia_moderacji WHERE nazwa_id = ?',
    ).bind('club-1004').first<{ akcja: string; raporty: number }>()).toEqual({
      akcja: 'odrzuc',
      raporty: 2,
    });
  });

  it('returns 404 without creating history for a missing club', async () => {
    const response = await request(
      '/api/admin/nazwy/club-missing',
      'POST',
      { akcja: 'odrzuc' },
      ADMIN,
    );
    expect(response.status).toBe(404);
    expect(await DB.prepare('SELECT COUNT(*) AS count FROM historia_moderacji')
      .first<{ count: number }>()).toEqual({ count: 0 });
  });

  it('rejects unknown actions without touching the club or history', async () => {
    await seedName('club-unknown-action');
    const response = await request(
      '/api/admin/nazwy/club-unknown-action',
      'POST',
      { akcja: 'wyczysc-wszystko' },
      ADMIN,
    );

    expect(response.status).toBe(400);
    expect(await DB.prepare('SELECT ukryte FROM nazwy WHERE id = ?')
      .bind('club-unknown-action').first<{ ukryte: number }>()).toEqual({ ukryte: 0 });
    expect(await DB.prepare('SELECT COUNT(*) AS count FROM historia_moderacji')
      .first<{ count: number }>()).toEqual({ count: 0 });
  });

  it('rolls the club action back when its history cannot be recorded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await seedName('club-1005');
    await DB.prepare(
      `CREATE TRIGGER fail_moderation_history
       BEFORE INSERT ON historia_moderacji
       BEGIN SELECT RAISE(FAIL, 'history unavailable'); END`,
    ).run();

    const response = await request(
      '/api/admin/nazwy/club-1005',
      'POST',
      { akcja: 'ukryj' },
      ADMIN,
    );
    await DB.prepare('DROP TRIGGER fail_moderation_history').run();
    expect(response.status).toBe(500);
    expect(await DB.prepare('SELECT ukryte FROM nazwy WHERE id = ?')
      .bind('club-1005').first<{ ukryte: number }>()).toEqual({ ukryte: 0 });
  });
});

describe('recent-vote ranking', () => {
  it('gives recent support a separate board while preserving the all-time top', async () => {
    const now = Date.now();
    await seedName('club-old1', 20, now - 30 * 86_400_000);
    await seedName('club-new1', 2, now);
    await DB.batch([
      DB.prepare(
        'INSERT INTO glosy (nazwa_id, glosujacy, wartosc, kiedy) VALUES (?, ?, 1, ?)',
      ).bind('club-old1', 'old-vote', now - 8 * 86_400_000),
      DB.prepare(
        'INSERT INTO glosy (nazwa_id, glosujacy, wartosc, kiedy) VALUES (?, ?, 1, ?)',
      ).bind('club-new1', 'new-vote', now),
    ]);

    const recent = await (await request('/api/nazwy?sort=gorace')).json<ListaResponse>();
    const top = await (await request('/api/nazwy?sort=top')).json<ListaResponse>();
    expect(recent.pozycje[0]).toMatchObject({ id: 'club-new1', wynikOkresu: 1 });
    expect(top.pozycje[0].id).toBe('club-old1');
  });
});
