import type { AkcjaModeracji } from '../../src/shared/rkg-api';

/**
 * Save the club snapshot and apply one moderation action in a single D1
 * transaction. History deliberately has no foreign key, so deleting the club
 * cannot erase the audit trail.
 */
export async function zapiszModeracje(
  db: D1Database,
  nazwaId: string,
  akcja: AkcjaModeracji,
  teraz = Date.now(),
): Promise<boolean> {
  const historia = db.prepare(
    `INSERT INTO historia_moderacji (id, nazwa_id, wynik, akcja, raporty, kiedy)
     SELECT ?, n.id, n.wynik, ?, COUNT(r.nazwa_id), ?
     FROM nazwy n LEFT JOIN raporty r ON r.nazwa_id = n.id
     WHERE n.id = ?
     GROUP BY n.id`,
  ).bind(crypto.randomUUID(), akcja, teraz, nazwaId);

  let operacje: D1PreparedStatement[];
  if (akcja === 'ukryj' || akcja === 'przywroc') {
    operacje = [
      db.prepare('UPDATE nazwy SET ukryte = ? WHERE id = ?')
        .bind(akcja === 'ukryj' ? 1 : 0, nazwaId),
    ];
  } else if (akcja === 'odrzuc') {
    operacje = [db.prepare('DELETE FROM raporty WHERE nazwa_id = ?').bind(nazwaId)];
  } else {
    operacje = [
      db.prepare('DELETE FROM glosy WHERE nazwa_id = ?').bind(nazwaId),
      db.prepare('DELETE FROM raporty WHERE nazwa_id = ?').bind(nazwaId),
      db.prepare('DELETE FROM nazwy WHERE id = ?').bind(nazwaId),
    ];
  }

  const [historyResult] = await db.batch([historia, ...operacje]);
  return (historyResult.meta.changes ?? 0) > 0;
}
