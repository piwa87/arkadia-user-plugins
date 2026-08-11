import { afterEach, describe, expect, it, vi } from 'vitest';
import { zuzyjLimit } from '../../api/src/quota';

interface Zdarzenie {
  glosujacy: string;
  rodzaj: string;
  kiedy: number;
}

/** Minimal in-memory implementation of the two D1 statements used by the quota. */
function fakeDb() {
  const zdarzenia: Zdarzenie[] = [];
  return {
    zdarzenia,
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              if (sql.includes('INSERT INTO zdarzenia')) {
                const [glosujacy, rodzaj, kiedy, , , od, limit] = args as [
                  string,
                  string,
                  number,
                  string,
                  string,
                  number,
                  number,
                ];
                const ile = zdarzenia.filter(
                  (z) => z.glosujacy === glosujacy && z.rodzaj === rodzaj && z.kiedy > od,
                ).length;
                if (ile < limit) {
                  zdarzenia.push({ glosujacy, rodzaj, kiedy });
                  return { meta: { changes: 1 } };
                }
                return { meta: { changes: 0 } };
              }
              if (sql.includes('DELETE FROM zdarzenia')) {
                const od = args[0] as number;
                const zostaja = zdarzenia.filter((z) => z.kiedy >= od);
                const changes = zdarzenia.length - zostaja.length;
                zdarzenia.splice(0, zdarzenia.length, ...zostaja);
                return { meta: { changes } };
              }
              throw new Error(`nieobslugiwane SQL: ${sql}`);
            },
            async first<T>() {
              if (!sql.includes('SELECT MIN(kiedy)')) throw new Error(`nieobslugiwane SQL: ${sql}`);
              const [glosujacy, rodzaj, od] = args as [string, string, number];
              const czasy = zdarzenia
                .filter(
                  (z) => z.glosujacy === glosujacy && z.rodzaj === rodzaj && z.kiedy > od,
                )
                .map((z) => z.kiedy);
              return { najstarsze: czasy.length ? Math.min(...czasy) : null } as T;
            },
          };
        },
      };
    },
  };
}

const DZIEN = 86_400_000;
const START = 2_000_000_000_000;

afterEach(() => vi.restoreAllMocks());

describe('daily RKG submission quota', () => {
  it('allows only one club in a rolling 24-hour window', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const db = fakeDb();

    const pierwszy = await zuzyjLimit(db as never, 'device-1', 'zgloszenie', 1, DZIEN, START);
    const drugi = await zuzyjLimit(
      db as never,
      'device-1',
      'zgloszenie',
      1,
      DZIEN,
      START + 1,
    );

    expect(pierwszy).toEqual({ dozwolony: true, ponowZaMs: 0 });
    expect(drugi.dozwolony).toBe(false);
    expect(drugi.ponowZaMs).toBe(DZIEN - 1);
    expect(db.zdarzenia).toHaveLength(1);
  });

  it('opens the next slot exactly 24 hours after the previous upload', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const db = fakeDb();

    await zuzyjLimit(db as never, 'device-1', 'zgloszenie', 1, DZIEN, START);
    const wynik = await zuzyjLimit(
      db as never,
      'device-1',
      'zgloszenie',
      1,
      DZIEN,
      START + DZIEN,
    );

    expect(wynik.dozwolony).toBe(true);
  });

  it('lets only one of two simultaneous submissions claim the slot', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const db = fakeDb();

    const wyniki = await Promise.all([
      zuzyjLimit(db as never, 'device-1', 'zgloszenie', 1, DZIEN, START),
      zuzyjLimit(db as never, 'device-1', 'zgloszenie', 1, DZIEN, START),
    ]);

    expect(wyniki.filter((w) => w.dozwolony)).toHaveLength(1);
    expect(db.zdarzenia).toHaveLength(1);
  });

  it('keeps device and action quotas independent', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const db = fakeDb();

    const wyniki = await Promise.all([
      zuzyjLimit(db as never, 'device-1', 'zgloszenie', 1, DZIEN, START),
      zuzyjLimit(db as never, 'device-2', 'zgloszenie', 1, DZIEN, START),
      zuzyjLimit(db as never, 'device-1', 'glos', 1, DZIEN, START),
    ]);

    expect(wyniki.every((w) => w.dozwolony)).toBe(true);
  });
});
