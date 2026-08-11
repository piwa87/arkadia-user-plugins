import type { CzysteZgloszenie } from './validate';
import { sprawdzLimit, type WynikLimitu } from './quota';

export const DZIEN = 86_400_000;

export type WynikZapisu =
  | { zapisany: false; limit: WynikLimitu }
  | { zapisany: true; id: string; zgloszenia: number; duplikat: boolean };

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
  teraz = Date.now(),
): Promise<WynikZapisu> {
  const reservationId = crypto.randomUUID();
  const nameId = crypto.randomUUID();
  const od = teraz - DZIEN;

  const claim = db.prepare(
    `INSERT INTO zdarzenia (id, glosujacy, rodzaj, kiedy)
     SELECT ?, ?, 'zgloszenie', ?
     WHERE (
       SELECT COUNT(*) FROM zdarzenia
       WHERE glosujacy = ? AND rodzaj = 'zgloszenie' AND kiedy > ?
     ) < 1`,
  ).bind(reservationId, dane.glosujacy, teraz, dane.glosujacy, od);

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
    const limit = await sprawdzLimit(db, dane.glosujacy, 'zgloszenie', 1, DZIEN, teraz);
    return { zapisany: false, limit };
  }

  const row = saveResult.results?.[0];
  if (!row) throw new Error('atomic submission invariant: claimed slot without saved club');

  // Best-effort maintenance outside the user-visible result.
  if (Math.random() < 0.02) {
    await db
      .prepare('DELETE FROM zdarzenia WHERE kiedy < ?')
      .bind(teraz - DZIEN)
      .run()
      .catch(() => undefined);
  }

  return {
    zapisany: true,
    id: row.id,
    zgloszenia: row.zgloszenia,
    duplikat: row.id !== nameId,
  };
}
