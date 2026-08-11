-- Baseline matching the schema already created in production before migrations
-- were introduced. IF NOT EXISTS makes adopting migrations non-destructive.

CREATE TABLE IF NOT EXISTS nazwy (
  id             TEXT PRIMARY KEY,
  klucz          TEXT NOT NULL UNIQUE,
  wynik          TEXT NOT NULL,
  typ            TEXT NOT NULL,
  przymiotnik    TEXT NOT NULL,
  rzeczownik     TEXT NOT NULL,
  liczba         TEXT NOT NULL,
  przypadek      TEXT NOT NULL,
  rola_przywodca TEXT,
  rola_zastepca  TEXT,
  rola_czlonek   TEXT,
  nick           TEXT,
  zgloszenia     INTEGER NOT NULL DEFAULT 1,
  wynik_glosow   INTEGER NOT NULL DEFAULT 0,
  ukryte         INTEGER NOT NULL DEFAULT 0,
  kiedy          INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS nazwy_top  ON nazwy (ukryte, wynik_glosow DESC, kiedy DESC);
CREATE INDEX IF NOT EXISTS nazwy_nowe ON nazwy (ukryte, kiedy DESC);

CREATE TABLE IF NOT EXISTS glosy (
  nazwa_id  TEXT NOT NULL,
  glosujacy TEXT NOT NULL,
  wartosc   INTEGER NOT NULL,
  kiedy     INTEGER NOT NULL,
  PRIMARY KEY (nazwa_id, glosujacy)
);

CREATE TABLE IF NOT EXISTS zdarzenia (
  glosujacy TEXT NOT NULL,
  rodzaj    TEXT NOT NULL,
  kiedy     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS zdarzenia_idx ON zdarzenia (glosujacy, rodzaj, kiedy);
