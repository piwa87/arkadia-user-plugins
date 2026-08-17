import type { PluginApi } from '@arkadia/plugin-types';

const BAG_COUNT = 6;

/**
 * Pack herbs into the configured number of bags (open → fill → close).
 */
export function pakujZiola(api: PluginApi, bagCount = BAG_COUNT): void {
  api.command.send('otworz woreczki', false);
  for (let i = 1; i <= bagCount; i++) {
    api.command.send(`wloz ziola do ${i}. woreczka`, false);
  }
  api.command.send('zamknij woreczki', false);
}