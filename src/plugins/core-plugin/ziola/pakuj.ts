import type { PluginApi } from '@arkadia/plugin-types';

export const PAKUJ_ZIOLA_GAG_TAG = 'pakujZiolaWoreczekGag';
const GAG_DURATION_MS = 4000;
const gagTimeouts = new WeakMap<PluginApi, ReturnType<typeof setTimeout>>();

function startWoreczekGag(api: PluginApi): void {
  const previousTimeout = gagTimeouts.get(api);
  if (previousTimeout) clearTimeout(previousTimeout);

  api.triggers.removeByTag(PAKUJ_ZIOLA_GAG_TAG);
  api.triggers.registerToken('woreczek', () => null, PAKUJ_ZIOLA_GAG_TAG, {
    caseInsensitive: true,
  });

  const timeout = setTimeout(() => {
    api.triggers.removeByTag(PAKUJ_ZIOLA_GAG_TAG);
    gagTimeouts.delete(api);
  }, GAG_DURATION_MS);
  gagTimeouts.set(api, timeout);
}

export function cleanupPakujZiola(api: PluginApi): void {
  const timeout = gagTimeouts.get(api);
  if (timeout) clearTimeout(timeout);
  gagTimeouts.delete(api);
  api.triggers.removeByTag(PAKUJ_ZIOLA_GAG_TAG);
}

/**
 * Pack herbs into bags (open → fill → close).
 *
 * @param startFrom - First bag to fill (default 1). Z zbierania leci od 3, bo
 *                    worki 1-2 sa dla +kon i -zmc w zisort.
 */
export function pakujZiola(api: PluginApi, bagCount?: number, startFrom = 1): void {
  if (bagCount === undefined) {
    const totalBags = Object.keys(api.herbs.getBags()).length;
    bagCount = totalBags > 0 ? totalBags - startFrom + 1 : 6;
  }
  startWoreczekGag(api);
  api.command.send('otworz woreczki', false);
  const end = startFrom + bagCount - 1;
  for (let i = startFrom; i <= end; i++) {
    api.command.send(`wloz ziola do ${i}. woreczka`, false);
  }
  api.command.send('zamknij woreczki', false);
}
