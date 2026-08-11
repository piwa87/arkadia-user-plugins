CREATE TABLE IF NOT EXISTS raporty (
  nazwa_id  TEXT NOT NULL,
  glosujacy TEXT NOT NULL,
  powod     TEXT NOT NULL,
  kiedy     INTEGER NOT NULL,
  PRIMARY KEY (nazwa_id, glosujacy)
);

CREATE INDEX IF NOT EXISTS raporty_nazwa ON raporty (nazwa_id, kiedy DESC);
