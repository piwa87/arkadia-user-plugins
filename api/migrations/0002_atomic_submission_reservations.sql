-- Nullable keeps every pre-migration row valid. New submission reservations
-- receive a UUID and can therefore be tied to their club upsert transaction.
ALTER TABLE zdarzenia ADD COLUMN id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS zdarzenia_id ON zdarzenia (id) WHERE id IS NOT NULL;
