import type { HerbForms, HerbUse, PluginApi } from '@arkadia/plugin-types';
import { withDelay } from '../../../lib/withDelay';
import { notify } from '../../../lib/notifications';
import { pakujZiola } from './pakuj';

const DELAY_MIN = 6123;
const DELAY_MAX = 6650;

// Herbs to sell — manually maintained list of herb IDs that are worthless to you.
// Add more IDs as needed (e.g. 'trawa', 'stulicha').
const SELL_LIST = new Set<string>([
  'borowik_szatanski',
  'borowik_szlachetny',
  'ciemiernik',
  'drabik',
  'hubka',
  'janowiec',
  'kocimietka',
  'kozlarz',
  'kruszyna',
  'kurzyslad',
  'marzanna',
  'maslak',
  'muchomor_czerwony',
  'muchomor_sromotnikowy',
  'oset',
  'ostrozeczka',
  'pierscieniak_gryn',
  'podgrzybek',
  'pokrzyk',
  'potoslin',
  'poziewnik',
  'rabarbar',
  'skrzyp',
  'starzec',
  'stroiczka',
  'stulicha',
  'szalej',
  'trawa',
]);

type HerbCategory = 'kon' | 'zmc' | 'stat' | 'other';

/** Return proper grammatical form of herb name for `wloz N <form> do woreczka`. */
function herbFormFor(forms: HerbForms | undefined, amount: number): string {
  if (!forms) return 'ziola';
  // wloz 1 <biernik>
  if (amount === 1) return forms.biernik;
  // wloz 2,3,4… <mnoga_biernik>
  if (amount % 10 >= 2 && amount % 10 <= 4 && (amount % 100 < 10 || amount % 100 >= 20)) {
    return forms.mnoga_biernik;
  }
  // wloz 5,6…0… <mnoga_dopelniacz>
  return forms.mnoga_dopelniacz;
}

/** First-match priority: +kon > -zmc > stat buff > other */
function classifyHerb(herbId: string, data: { herb_id_to_use: Record<string, HerbUse[]> }): HerbCategory {
  const uses = data.herb_id_to_use[herbId];
  if (!uses) return 'other';

  for (const use of uses) {
    if (use.smokable) continue;
    const eff = use.effect ?? '';
    if (eff.includes('+kon')) return 'kon';
  }
  for (const use of uses) {
    if (use.smokable) continue;
    const eff = use.effect ?? '';
    if (eff.includes('-zmc')) return 'zmc';
  }
  for (const use of uses) {
    if (use.smokable) continue;
    const eff = use.effect ?? '';
    if (
      eff.includes('+sila') ||
      eff.includes('+mana') ||
      eff.includes('+odw') ||
      eff.includes('+int') ||
      eff.includes('+odp')
    )
      return 'stat';
  }
  return 'other';
}

// Target bag(s) per category, in fill order.
function targetBagsFor(category: HerbCategory, totalBagCount: number): number[] {
  switch (category) {
    case 'kon':
      return [1, 2];
    case 'zmc':
      return [3, 4];
    case 'stat':
      return [5];
    case 'other': {
      const bags: number[] = [];
      for (let i = 6; i <= totalBagCount; i++) bags.push(i);
      return bags;
    }
  }
}

export async function sortHerbsByCategory(api: PluginApi): Promise<void> {
  const data = await api.herbs.getData();
  const bags = api.herbs.getBags();
  const bagIds = Object.keys(bags)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (!data || bagIds.length === 0) {
    api.output.print('Brak danych — otworz herb UI przez obz! najpierw.');
    return;
  }

  // 1. Sum total per herb across all bags
  const totals = new Map<string, number>();
  for (const bag of Object.values(bags)) {
    for (const [herbId, count] of Object.entries(bag.herbs)) {
      totals.set(herbId, (totals.get(herbId) ?? 0) + count);
    }
  }
  if (totals.size === 0) {
    api.output.print('Brak ziol w workach.');
    return;
  }

  // 2. Classify all herbs
  const grouped: Record<HerbCategory, Array<{ herbId: string; count: number }>> = {
    kon: [],
    zmc: [],
    stat: [],
    other: [],
  };
  let totalHerbs = 0;
  for (const [herbId, count] of totals) {
    if (count <= 0) continue;
    const cat = classifyHerb(herbId, data);
    grouped[cat].push({ herbId, count });
    totalHerbs += count;
  }

  api.output.print(`Sortuje ${totalHerbs} ziol...`);

  // 3. Batch: open all bags → take all herbs → put by category → close all
  api.command.send('otworz woreczki', false);

  // Take ALL herbs from each bag (one command per bag)
  for (const bagId of bagIds) {
    api.command.send(`wez ziola z ${bagId}. woreczka`, false);
  }

  // Put herbs into target bags by category
  let sortedTotal = 0;
  const bagFill: number[] = new Array(Math.max(...bagIds, 6) + 1).fill(0);

  for (const cat of ['kon', 'zmc', 'stat', 'other'] as HerbCategory[]) {
    const herbs = grouped[cat];
    if (herbs.length === 0) continue;

    const targets = targetBagsFor(cat, bagIds.length);
    let tIdx = 0;

    for (const { herbId, count: total } of herbs) {
      const forms = data.herb_id_to_odmiana[herbId];
      let remaining = total;

      while (remaining > 0 && tIdx < targets.length) {
        const bagId = targets[tIdx];
        const amount = Math.min(remaining, 40 - bagFill[bagId]);
        if (amount <= 0) { tIdx++; continue; }

        const herbName = herbFormFor(forms, amount);
        api.command.send(`wloz ${amount} ${herbName} do ${bagId}. woreczka`, true);
        remaining -= amount;
        bagFill[bagId] += amount;
        sortedTotal += amount;
      }
      tIdx = 0; // reset target index for next herb in same category
    }
  }

  // Catch-all: resztki z ekwipunku do workow 3+
  const startBag = Math.min(3, bagIds.length);
  const endBag = Math.max(...bagIds);
  for (let i = startBag; i <= endBag; i++) {
    api.command.send(`wloz ziola do ${i}. woreczka`, false);
  }

  api.command.send('zamknij woreczki', false);
  api.output.print(`Posortowano ${sortedTotal} ziol.`);
}

export async function sellJunkHerbs(api: PluginApi): Promise<void> {
  const bags = api.herbs.getBags();
  const bagEntries = Object.entries(bags);
  if (bagEntries.length === 0) {
    api.output.print('Brak danych o workach — uzyj obz! najpierw.');
    return;
  }

  let takenAny = false;
  let totalTaken = 0;

  for (const [bagNumber, bag] of bagEntries) {
    const bagId = Number(bagNumber);
    if (!Number.isFinite(bagId)) continue;

    for (const [herbId, count] of Object.entries(bag.herbs)) {
      if (!SELL_LIST.has(herbId) || count <= 0) continue;

      const taken = await api.herbs.take(herbId, count, bagId);
      if (taken > 0) {
        takenAny = true;
        totalTaken += taken;
      }
    }
  }

  if (takenAny) {
    api.output.print(`Wyjeto ${totalTaken} sztuk do sprzedania.`);
    await api.command.send('sprzedaj ziola');
  } else {
    api.output.print('Nie znaleziono ziol do sprzedania na liscie.');
  }
}

/**
 * Register aliases for herb gathering, packing, and batch harvesting.
 *
 * - `/zio_szukaj` — search for herbs twice
 * - `/zio_pakuj[N]` — pack herbs into N bags (default 6)
 * - `zii [direction] [count]` — go direction, search & pack, repeat N times
 * - `zx[N]` — shorthand for `/zio_pakuj[N]`
 * - `spziola` — take junk herbs from bags and sell them
 * - `zisort` — sort all herbs into bags by category (healing, -zmc, stat, rest)
 */
export function setupGatherAliases(api: PluginApi): string[] {
  const ids: string[] = [];

  ids.push(
    api.aliases.register(/^spziola$/i, () => {
      void sellJunkHerbs(api);
      return true;
    }),
  );

  ids.push(
    api.aliases.register(/^zisort!$/i, () => {
      void sortHerbsByCategory(api);
      return true;
    }),
  );

  ids.push(
    api.aliases.register(/^\/zio_szukaj$/i, () => {
      api.command.send('szukaj ziol');
      withDelay(DELAY_MIN, DELAY_MAX, () => api.command.send('szukaj ziol'));
      return true;
    }),
  );

  ids.push(
    api.aliases.register(/^\/zio_pakuj(\d+)?$/i, (matches) => {
      const bagCount = matches?.[1] ? parseInt(matches[1], 10) : undefined;
      pakujZiola(api, bagCount);
      return true;
    }),
  );

  ids.push(
    api.aliases.register(/^zii(?:\s+(\S+)(?:\s+(\d+))?)?$/i, (matches) => {
      const kier = matches?.[1] ?? 'idz';
      const ile = matches?.[2] ? parseInt(matches[2], 10) : 4;

      function step(remaining: number): void {
        if (remaining <= 0) {
          pakujZiola(api, undefined, 3);
          api.command.send('play_tink');
          notify('Ziola: Done!');
          return;
        }
        api.command.send(kier);
        api.command.send('szukaj ziol');
        withDelay(DELAY_MIN, DELAY_MAX, () => {
          api.command.send('szukaj ziol');
          withDelay(DELAY_MIN, DELAY_MAX, () => step(remaining - 1));
        });
      }
      step(ile);
      return true;
    }),
  );

  ids.push(
    api.aliases.register(/^zx(\d+)?$/i, (matches) => {
      api.output.print('--> pakuje zielsko');
      const n = matches?.[1] ? parseInt(matches[1], 10) : undefined;
      pakujZiola(api, n, 3);
      return true;
    }),
  );

  return ids;
}
