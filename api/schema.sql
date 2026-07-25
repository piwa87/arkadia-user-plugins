-- RKG wall — D1 (SQLite) schema.
-- Apply with:  wrangler d1 execute rkg-wall --file=schema.sql        (remote)
--              wrangler d1 execute rkg-wall --local --file=schema.sql (local dev)

CREATE TABLE IF NOT EXISTS nazwy (
  id            TEXT PRIMARY KEY,
  klucz         TEXT NOT NULL UNIQUE,          -- normalised wynik (dedupe key)
  wynik         TEXT NOT NULL,                 -- the inflected club name
  typ           TEXT NOT NULL,
  przymiotnik   TEXT NOT NULL,                 -- base adjective the client sent
  rzeczownik    TEXT NOT NULL,
  liczba        TEXT NOT NULL,
  przypadek     TEXT NOT NULL,
  rola_przywodca TEXT,                          -- leadership titles (optional)
  rola_zastepca  TEXT,
  rola_czlonek   TEXT,
  nick          TEXT,                          -- optional public nick
  zgloszenia    INTEGER NOT NULL DEFAULT 1,    -- how many people generated it
  wynik_glosow  INTEGER NOT NULL DEFAULT 0,    -- sum of votes
  ukryte        INTEGER NOT NULL DEFAULT 0,    -- manual takedown flag
  kiedy         INTEGER NOT NULL               -- epoch ms of first submission
);

CREATE INDEX IF NOT EXISTS nazwy_top  ON nazwy (ukryte, wynik_glosow DESC, kiedy DESC);
CREATE INDEX IF NOT EXISTS nazwy_nowe ON nazwy (ukryte, kiedy DESC);

CREATE TABLE IF NOT EXISTS glosy (
  nazwa_id  TEXT NOT NULL,
  glosujacy TEXT NOT NULL,                     -- per-device random id
  wartosc   INTEGER NOT NULL,                  -- +1 / -1
  kiedy     INTEGER NOT NULL,
  PRIMARY KEY (nazwa_id, glosujacy)
);

-- Lightweight per-device rate-limit log (submissions + votes).
CREATE TABLE IF NOT EXISTS zdarzenia (
  glosujacy TEXT NOT NULL,
  rodzaj    TEXT NOT NULL,                     -- 'zgloszenie' | 'glos'
  kiedy     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS zdarzenia_idx ON zdarzenia (glosujacy, rodzaj, kiedy);
