const DZIEN = 86_400_000;

interface QuotaStatement {
  bind(...values: unknown[]): QuotaStatement;
  run(): Promise<{ meta: { changes?: number } }>;
  first<T>(): Promise<T | null>;
}

/** The small structural slice of D1 used by the quota engine. */
export interface QuotaDb {
  prepare(sql: string): QuotaStatement;
}

export interface WynikLimitu {
  dozwolony: boolean;
  ponowZaMs: number;
}

/**
 * Atomically consume one slot in a sliding-window quota.
 *
 * Keeping the check and insert in one SQLite statement prevents simultaneous
 * requests from both observing and consuming the same free daily slot.
 */
export async function zuzyjLimit(
  db: QuotaDb,
  glosujacy: string,
  rodzaj: string,
  limit: number,
  oknoMs: number,
  teraz = Date.now(),
): Promise<WynikLimitu> {
  const od = teraz - oknoMs;
  const wynik = await db.prepare(
    `INSERT INTO zdarzenia (glosujacy, rodzaj, kiedy)
     SELECT ?, ?, ?
     WHERE (
       SELECT COUNT(*) FROM zdarzenia
       WHERE glosujacy = ? AND rodzaj = ? AND kiedy > ?
     ) < ?`,
  )
    .bind(glosujacy, rodzaj, teraz, glosujacy, rodzaj, od, limit)
    .run();

  if ((wynik.meta.changes ?? 0) > 0) {
    // Maintenance only: a pruning failure must not make an accepted upload
    // appear to have failed after its slot was consumed.
    if (Math.random() < 0.02) {
      await db
        .prepare('DELETE FROM zdarzenia WHERE kiedy < ?')
        .bind(teraz - DZIEN)
        .run()
        .catch(() => undefined);
    }
    return { dozwolony: true, ponowZaMs: 0 };
  }

  const row = await db.prepare(
    `SELECT MIN(kiedy) AS najstarsze FROM zdarzenia
     WHERE glosujacy = ? AND rodzaj = ? AND kiedy > ?`,
  )
    .bind(glosujacy, rodzaj, od)
    .first<{ najstarsze: number | null }>();
  const ponowZaMs = Math.max(1_000, (row?.najstarsze ?? teraz) + oknoMs - teraz);
  return { dozwolony: false, ponowZaMs };
}

export function formatujCzekanie(ms: number): string {
  const minuty = Math.max(1, Math.ceil(ms / 60_000));
  const godziny = Math.floor(minuty / 60);
  const reszta = minuty % 60;
  if (godziny === 0) return `${reszta} min`;
  if (reszta === 0) return `${godziny} godz.`;
  return `${godziny} godz. ${reszta} min`;
}

export async function zwolnijLimit(
  db: QuotaDb,
  glosujacy: string,
  rodzaj: string,
  kiedy: number,
): Promise<void> {
  await db
    .prepare('DELETE FROM zdarzenia WHERE glosujacy = ? AND rodzaj = ? AND kiedy = ?')
    .bind(glosujacy, rodzaj, kiedy)
    .run()
    .catch(() => undefined);
}
