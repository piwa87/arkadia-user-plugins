-- Raw addresses are never stored. The Worker writes only a secret HMAC into
-- this nullable column; old reservations remain valid through glosujacy.
ALTER TABLE zdarzenia ADD COLUMN siec TEXT;

CREATE INDEX IF NOT EXISTS zdarzenia_siec_idx
  ON zdarzenia (siec, rodzaj, kiedy) WHERE siec IS NOT NULL;
