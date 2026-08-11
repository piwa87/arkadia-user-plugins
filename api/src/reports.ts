import type { PowodRaportu } from '../../src/shared/rkg-api';
import { sprawdzLimit } from './quota';

const GODZINA = 3_600_000;
const LIMIT_RAPORTOW = 10;

export type WynikRaportu =
  | { status: 'przyjete' }
  | { status: 'duplikat' }
  | { status: 'nie_ma' }
  | { status: 'limit'; ponownieZaMs: number };

/** Reserve a rate-limit slot and save a fixed report reason in one transaction. */
export async function zapiszRaport(
  db: D1Database,
  nazwaId: string,
  glosujacy: string,
  powod: PowodRaportu,
  teraz = Date.now(),
): Promise<WynikRaportu> {
  const reservationId = crypto.randomUUID();
  const od = teraz - GODZINA;
  const claim = db.prepare(
    `INSERT INTO zdarzenia (id, glosujacy, rodzaj, kiedy)
     SELECT ?, ?, 'raport', ?
     WHERE EXISTS (SELECT 1 FROM nazwy WHERE id = ? AND ukryte = 0)
       AND NOT EXISTS (
         SELECT 1 FROM raporty WHERE nazwa_id = ? AND glosujacy = ?
       )
       AND (
         SELECT COUNT(*) FROM zdarzenia
         WHERE glosujacy = ? AND rodzaj = 'raport' AND kiedy > ?
       ) < ?`,
  ).bind(
    reservationId,
    glosujacy,
    teraz,
    nazwaId,
    nazwaId,
    glosujacy,
    glosujacy,
    od,
    LIMIT_RAPORTOW,
  );
  const save = db.prepare(
    `INSERT INTO raporty (nazwa_id, glosujacy, powod, kiedy)
     SELECT ?, ?, ?, ? FROM zdarzenia WHERE id = ?
     RETURNING nazwa_id`,
  ).bind(nazwaId, glosujacy, powod, teraz, reservationId);

  const [claimResult, saveResult] = await db.batch<{ nazwa_id: string }>([claim, save]);
  if ((claimResult.meta.changes ?? 0) > 0) {
    if (!saveResult.results?.[0]) throw new Error('report invariant: claimed slot without report');
    return { status: 'przyjete' };
  }

  const duplicate = await db.prepare(
    'SELECT 1 AS jest FROM raporty WHERE nazwa_id = ? AND glosujacy = ?',
  ).bind(nazwaId, glosujacy).first<{ jest: number }>();
  if (duplicate) return { status: 'duplikat' };

  const name = await db.prepare('SELECT 1 AS jest FROM nazwy WHERE id = ? AND ukryte = 0')
    .bind(nazwaId)
    .first<{ jest: number }>();
  if (!name) return { status: 'nie_ma' };

  const limit = await sprawdzLimit(
    db,
    glosujacy,
    'raport',
    LIMIT_RAPORTOW,
    GODZINA,
    teraz,
  );
  return { status: 'limit', ponownieZaMs: limit.ponowZaMs };
}
