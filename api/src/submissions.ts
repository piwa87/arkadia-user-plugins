import type { CzysteZgloszenie } from './validate';
import { DZIEN_MS } from './limits';
import { posprzatajStareZdarzenia, type WynikLimitu } from './quota';

export type WynikZapisu =
  | { zapisany: false; limit: WynikLimitu }
  | { zapisany: true; id: string; zgloszenia: number; duplikat: boolean };

/** Read the strict daily slot shared by the installation and its network. */
export async function sprawdzLimitZgloszenia(
  db: D1Database,
  glosujacy: string,
  siec: string,
  teraz = Date.now(),
): Promise<WynikLimitu> {
  const row = await db.prepare(
    `SELECT MAX(kiedy) AS ostatnie FROM zdarzenia
     WHERE rodzaj = 'zgloszenie' AND kiedy > ? AND (glosujacy = ? OR siec = ?)`,
  )
    .bind(teraz - DZIEN_MS, glosujacy, siec)
    .first<{ ostatnie: number | null }>();
  if (row?.ostatnie == null) return { dozwolony: true, ponowZaMs: 0 };
  return {
    dozwolony: false,
    ponowZaMs: Math.max(1_000, row.ostatnie + DZIEN_MS - teraz),
  };
}

/**
 * Atomically claim the daily slot and insert/update the generated club.
 *
 * The upsert reads only the reservation UUID created by the first statement.
 * D1 executes the batch as a transaction, so an upsert failure rolls the quota
 * claim back; a denied claim makes the upsert a harmless zero-row statement.
 */
export async function zapiszZgloszenie(
  db: D1Database,
  dane: CzysteZgloszenie,
  siec: string,
  teraz = Date.now(),
): Promise<WynikZapisu> {
  const reservationId = crypto.randomUUID();
  const nameId = crypto.randomUUID();
  const od = teraz - DZIEN_MS;

  const claim = db.prepare(
    `INSERT INTO zdarzenia (id, glosujacy, siec, rodzaj, kiedy)
     SELECT ?, ?, ?, 'zgloszenie', ?
     WHERE NOT EXISTS (
       SELECT 1 FROM zdarzenia
       WHERE rodzaj = 'zgloszenie' AND kiedy > ? AND (glosujacy = ? OR siec = ?)
     )`,
  ).bind(reservationId, dane.glosujacy, siec, teraz, od, dane.glosujacy, siec);

  const save = db.prepare(
    `INSERT INTO nazwy
       (id, klucz, wynik, typ, przymiotnik, rzeczownik, liczba, przypadek,
        rola_przywodca, rola_zastepca, rola_czlonek, nick, kiedy)
     SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?
     FROM zdarzenia WHERE id = ?
     ON CONFLICT (klucz) DO UPDATE SET zgloszenia = nazwy.zgloszenia + 1
     RETURNING id, zgloszenia`,
  ).bind(
    nameId,
    dane.klucz,
    dane.wynik,
    dane.typ,
    dane.przymiotnik,
    dane.rzeczownik,
    dane.liczba,
    dane.przypadek,
    dane.role?.przywodca ?? null,
    dane.role?.zastepca ?? null,
    dane.role?.czlonek ?? null,
    dane.nick ?? null,
    teraz,
    reservationId,
  );

  const [claimResult, saveResult] = await db.batch<{ id: string; zgloszenia: number }>([
    claim,
    save,
  ]);
  if ((claimResult.meta.changes ?? 0) === 0) {
    const limit = await sprawdzLimitZgloszenia(db, dane.glosujacy, siec, teraz);
    return { zapisany: false, limit };
  }

  const row = saveResult.results?.[0];
  if (!row) throw new Error('atomic submission invariant: claimed slot without saved club');

  await posprzatajStareZdarzenia(db, teraz);

  return {
    zapisany: true,
    id: row.id,
    zgloszenia: row.zgloszenia,
    duplikat: row.id !== nameId,
  };
}
