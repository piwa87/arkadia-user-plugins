import type { Pozycja } from '../../src/shared/rkg-api';

export function toRankingEntry(row: Record<string, unknown>): Pozycja {
  const role = row.rola_przywodca || row.rola_zastepca || row.rola_czlonek
    ? {
        przywodca: (row.rola_przywodca as string) ?? '',
        zastepca: (row.rola_zastepca as string) ?? '',
        czlonek: (row.rola_czlonek as string) ?? '',
      }
    : undefined;
  return {
    id: row.id as string,
    wynik: row.wynik as string,
    role,
    wynikGlosow: (row.wynik_glosow as number) ?? 0,
    wynikOkresu: row.wynik_okresu == null ? undefined : (row.wynik_okresu as number),
    zgloszenia: (row.zgloszenia as number) ?? 1,
    nick: (row.nick as string) ?? undefined,
    kiedy: (row.kiedy as number) ?? 0,
  };
}
