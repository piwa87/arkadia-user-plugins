import type { PluginApi } from '@arkadia/plugin-types';
import { withDelay } from '../../../lib/withDelay';
import { notify } from '../../../lib/notifications';
import { pakujZiola } from './pakuj';

const DELAY_MIN = 6123;
const DELAY_MAX = 6650;

/**
 * Register aliases for herb gathering, packing, and batch harvesting.
 *
 * - `/zio_szukaj` — search for herbs twice
 * - `/zio_pakuj[N]` — pack herbs into N bags (default 6)
 * - `zii [direction] [count]` — go direction, search & pack, repeat N times
 * - `zx[N]` — shorthand for `/zio_pakuj[N]`
 */
export function setupGatherAliases(api: PluginApi): string[] {
  const ids: string[] = [];

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
          pakujZiola(api);
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
      const n = matches?.[1] ?? '';
      api.command.send(`/zio_pakuj${n}`);
      return true;
    }),
  );

  return ids;
}