import { GODZINA_MS } from './limits';
import { posprzatajStareZdarzenia, sprawdzLimit, type WynikLimitu } from './quota';

export type WynikZapisuGlosu =
  | { status: 'zapisany'; wynikGlosow: number }
  | { status: 'nie_ma' }
  | { status: 'limit'; limit: WynikLimitu };

/**
 * Reserve a rate-limit slot, change the vote and refresh the cached score in
 * one D1 transaction. The reservation UUID gates the later statements, so a
 * rejected claim cannot change either the vote or the score.
 */
export async function zapiszGlos(
  db: D1Database,
  nazwaId: string,
  glosujacy: string,
  wartosc: 1 | -1 | 0,
  limitGlosow: number,
  teraz = Date.now(),
): Promise<WynikZapisuGlosu> {
  const reservationId = crypto.randomUUID();
  const od = teraz - GODZINA_MS;
  const claim = db.prepare(
    `INSERT INTO zdarzenia (id, glosujacy, rodzaj, kiedy)
     SELECT ?, ?, 'glos', ?
     WHERE EXISTS (SELECT 1 FROM nazwy WHERE id = ? AND ukryte = 0)
       AND (
         SELECT COUNT(*) FROM zdarzenia
         WHERE glosujacy = ? AND rodzaj = 'glos' AND kiedy > ?
       ) < ?`,
  ).bind(reservationId, glosujacy, teraz, nazwaId, glosujacy, od, limitGlosow);

  const change = wartosc === 0
    ? db.prepare(
      `DELETE FROM glosy
       WHERE nazwa_id = ? AND glosujacy = ?
         AND EXISTS (SELECT 1 FROM zdarzenia WHERE id = ?)`,
    ).bind(nazwaId, glosujacy, reservationId)
    : db.prepare(
      `INSERT INTO glosy (nazwa_id, glosujacy, wartosc, kiedy)
       SELECT ?, ?, ?, ? FROM zdarzenia WHERE id = ?
       ON CONFLICT (nazwa_id, glosujacy)
       DO UPDATE SET wartosc = excluded.wartosc, kiedy = excluded.kiedy`,
    ).bind(nazwaId, glosujacy, wartosc, teraz, reservationId);

  const refreshScore = db.prepare(
    `UPDATE nazwy
     SET wynik_glosow = (
       SELECT COALESCE(SUM(wartosc), 0) FROM glosy WHERE nazwa_id = ?
     )
     WHERE id = ? AND EXISTS (SELECT 1 FROM zdarzenia WHERE id = ?)
     RETURNING wynik_glosow`,
  ).bind(nazwaId, nazwaId, reservationId);

  const [claimResult, , scoreResult] = await db.batch<{ wynik_glosow: number }>([
    claim,
    change,
    refreshScore,
  ]);
  if ((claimResult.meta.changes ?? 0) > 0) {
    const score = scoreResult.results?.[0]?.wynik_glosow;
    if (score == null) throw new Error('vote invariant: claimed slot without refreshed score');
    await posprzatajStareZdarzenia(db, teraz);
    return { status: 'zapisany', wynikGlosow: score };
  }

  const name = await db.prepare('SELECT 1 AS jest FROM nazwy WHERE id = ? AND ukryte = 0')
    .bind(nazwaId)
    .first<{ jest: number }>();
  if (!name) return { status: 'nie_ma' };

  const limit = await sprawdzLimit(db, glosujacy, 'glos', limitGlosow, GODZINA_MS, teraz);
  return { status: 'limit', limit };
}
