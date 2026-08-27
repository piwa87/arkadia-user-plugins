import type { PluginApi } from '@arkadia/plugin-types';

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
  api.command.send('otworz woreczki', false);
  const end = startFrom + bagCount - 1;
  for (let i = startFrom; i <= end; i++) {
    api.command.send(`wloz ziola do ${i}. woreczka`, false);
  }
  api.command.send('zamknij woreczki', false);
}