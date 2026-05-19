import type { PluginApi } from '@arkadia/plugin-types';

interface Enemy {
  name: string;
  short: string;
  profession: string;
  guild: string;
  weapon: string;
  level: string;
}

interface RaState {
  enemies: Enemy[];
  debug?: boolean;
}

const SYNCED_KEYS_STORAGE = 'synced_enemy_keys';

function getSyncedKeys(): string[] {
  return [];
}

function setSyncedKeys(_keys: string[]): void {
}

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

function pad(str: string | undefined, len: number): string {
  return (str || '')
    .substring(0, len)
    .padEnd(len);
}

function printEnemyLine(
  api: PluginApi,
  color: string,
  name: string,
  short: string,
  profession: string,
  guild: string,
  weapon: string,
  level: string
): void {
  cecho(
    api,
    `
${color} ${pad(name, 16)} ${pad(short, 35)} ${pad(profession, 13)} ${pad(guild, 8)} ${pad(weapon, 13)} ${pad(level, 21)}`
  );
}

function showEnemyShort(api: PluginApi, state: RaState): void {
  if (!Array.isArray(state.enemies) || state.enemies.length === 0) {
    cecho(api, "\n<yellow>Lista wrogow rodziny wydaje sie nie zaladowana.\n");
    return;
  }
  const names = state.enemies.map((e) => e.name).join(', ');
  cecho(api, `
<yellow>Obecni wrogowie rodziny to: <tomato>${names}

`);
}

function showEnemyTable(api: PluginApi, state: RaState): void {
  if (!Array.isArray(state.enemies) || state.enemies.length === 0) {
    cecho(api, "\n<yellow>Lista wrogow rodziny wydaje sie nie zaladowana.\n");
    return;
  }
  const totalWidth = 106;
  cecho(api, "\n<white>Obecna lista wrogow rodziny:\n");
  cecho(api, `
${'-'.repeat(totalWidth)}`);
  printEnemyLine(
    api,
    '<yellow>',
    'Imie',
    'Opis',
    'Profesja',
    'Gildia',
    'Bron',
    'Poziom'
  );
  cecho(api, `
${'-'.repeat(totalWidth)}`);
  for (const enemy of state.enemies) {
    printEnemyLine(
      api,
      '<orange>',
      enemy.name,
      enemy.short,
      enemy.profession,
      enemy.guild,
      enemy.weapon,
      enemy.level
    );
  }
  cecho(api, `
${'-'.repeat(totalWidth)}

`);
}

function mergeEnemies(api: PluginApi, state: RaState): void {
  if (!Array.isArray(state.enemies) || state.enemies.length === 0) return;
  const previousKeys = new Set(getSyncedKeys());
  const currentKeys = new Set<string>();
  let added = 0;
  let skipped = 0;
  let removed = 0;

  for (const enemy of state.enemies) {
    const name = enemy.name || '';
    const description = (enemy.short || '').toLowerCase();
    if (!name) continue;

    const allPeople = api.people.getAll();
    const matches = allPeople.filter(
      (p: any) => p.description.toLowerCase() === description
    );

    if (matches.length === 1) {
      const key = api.people.makeKey(matches[0].name, matches[0].description);
      currentKeys.add(key);
      api.people.markEnemy(key);
      skipped++;
    } else {
      const key = api.people.makeKey(name, description);
      currentKeys.add(key);
      if (!api.people.findByKey(key)) {
        api.people.add({
          name,
          description,
          guild: enemy.guild || ''
        });
        added++;
      } else {
        skipped++;
      }
      api.people.markEnemy(key);
    }
  }

  for (const oldKey of previousKeys) {
    if (!currentKeys.has(oldKey)) {
      const person = api.people.findByKey(oldKey);
      if (person) {
        api.people.unmarkEnemy(oldKey);
        removed++;
      }
    }
  }

  setSyncedKeys([...currentKeys]);
  if (state.debug) {
    console.log(
      `[RA Enemies] Sync: added=${added}, skipped=${skipped}, removed=${removed}`
    );
  }
}

export function setupEnemies(api: PluginApi, state: RaState): () => void {
  api.aliases.register(/^\/ra_wrogowie$/, () => {
    showEnemyTable(api, state);
    return true;
  });

  api.aliases.register(/^\/ra_wrogowie_krotko$/, () => {
    showEnemyShort(api, state);
    return true;
  });

  api.aliases.register(/^\/ra_wrogowie_sync$/, () => {
    mergeEnemies(api, state);
    cecho(api, "\n<green>Zsynchronizowano liste wrogow.\n");
    return true;
  });

  return () => {};
}
