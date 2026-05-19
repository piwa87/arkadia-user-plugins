import type { PluginApi } from '@arkadia/plugin-types';
import { createDedupedBind } from './bind-utils';

const NPC_SUBSTRINGS = [
  'racowity energiczny gnom',
  'ednooki opalony mezczyzna',
  'erwowy czujny gnom',
  'legancki spokojny mezczyzna',
  'niady muskularny mezczyzna',
  'tary siwy mezczyzna',
  'ympatyczny pogodny mezczyzna',
  'apracowany gruby mezczyzna',
  'ysoki mocny mezczyzna',
];

export function setupNpcOrders(api: PluginApi): () => void {
  const tag = 'ra:npc-orders';
  const dedupedBind = createDedupedBind(api);

  for (const substring of NPC_SUBSTRINGS) {
    api.triggers.register(
      new RegExp(substring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      (line) => {
        dedupedBind.set('zapytaj sprzedawce o prace', undefined, true);
        return line;
      },
      tag,
    );
  }

  api.triggers.register(
    /Tak, mam pewne pilne zamowienie\./,
    (line) => {
      dedupedBind.set('zapytaj sprzedawce o czas', undefined, true);
      return line;
    },
    tag,
  );

  api.triggers.register(
    /Nie, w tej chwili niczego mi nie trzeba\./,
    (line) => {
      dedupedBind.set('zapytaj sprzedawce o czas', undefined, true);
      return line;
    },
    tag,
  );

  api.triggers.register(
    /^Dalsze informacje wydaja sie slabo czytelne. Mozesz rozroznic jedynie nastepujece znaki: (.*)/,
    (line, matches) => {
      if (!matches) return line;
      api.output.print(`\n<yellow>Lokacja z listu: <white>${matches[1]}\n`);
      return line;
    },
    tag,
  );

  return () => {
    api.triggers.removeByTag(tag);
    dedupedBind.cleanup();
  };
}
