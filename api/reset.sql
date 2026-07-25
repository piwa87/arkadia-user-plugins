-- RKG wall — wipe every row, keep the schema. Beta escape hatch.
-- Apply with:  yarn db:reset        (== wrangler d1 execute rkg-wall --remote --file=reset.sql)
--
-- Same effect as the in-game `rkgnuke <klucz>` alias, but works even when the
-- Worker is broken. There is no undo.

DELETE FROM glosy;
DELETE FROM zdarzenia;
DELETE FROM nazwy;
