CREATE TABLE IF NOT EXISTS historia_moderacji (
  id       TEXT PRIMARY KEY,
  nazwa_id TEXT NOT NULL,
  wynik    TEXT NOT NULL,
  akcja    TEXT NOT NULL,
  raporty  INTEGER NOT NULL DEFAULT 0,
  kiedy    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS historia_moderacji_kiedy
  ON historia_moderacji (kiedy DESC);
