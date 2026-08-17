import type { PluginApi } from '@arkadia/plugin-types';

const TAG = 'idl';
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

let apiRef: PluginApi | null = null;
let timeoutIds: ReturnType<typeof setTimeout>[] = [];
let startTime: number | null = null;

function randBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

function scheduleNext(api: PluginApi): void {
  if (startTime === null) return;
  const elapsed = Date.now() - startTime;
  if (elapsed >= THREE_HOURS_MS) {
    api.output.print('[IDL] Koniec 3-godzinnego cyklu.');
    startTime = null;
    return;
  }

  const delay = randBetween(900_000, 1_500_000); // 15–25 min
  const remaining = THREE_HOURS_MS - elapsed;
  const actualDelay = Math.min(delay, remaining);

  const id = setTimeout(() => {
    api.command.send('stan');
    api.output.print(`[IDL] Wysłano 'stan' (${Math.round((Date.now() - startTime!) / 60000)} min z 180)`);
    scheduleNext(api);
  }, actualDelay);

  timeoutIds.push(id);
}

export function setupIdl(api: PluginApi): void {
  apiRef = api;

  api.aliases.register(/^idl$/i, () => {
    if (startTime !== null) {
      api.output.print('[IDL] Cykl już trwa.');
      return true;
    }

    startTime = Date.now();
    api.output.print('[IDL] Rusza 3-godzinny cykl "stan" co 15–25 min.');
    scheduleNext(api);
    return true;
  });
}

export function destroyIdl(): void {
  for (const id of timeoutIds) clearTimeout(id);
  timeoutIds = [];
  apiRef?.triggers.removeByTag(TAG);
  apiRef = null;
  startTime = null;
}