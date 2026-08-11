-- RKG wall — wipe every row, keep the schema. Beta escape hatch.
-- Emergency only: wrangler d1 execute rkg-wall --remote --file=reset.sql
--
-- Emergency operator-only reset. The public/admin APIs intentionally expose
-- only per-club moderation. There is no undo.

DELETE FROM glosy;
DELETE FROM raporty;
DELETE FROM zdarzenia;
DELETE FROM nazwy;
