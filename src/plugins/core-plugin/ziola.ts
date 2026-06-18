import type { PluginApi } from '@arkadia/plugin-types';
import { withDelay } from '../../lib/withDelay';
import { notify } from '../../lib/notifications';
import { registerTextAlias } from '../../lib/registerTextAlias';

const BAG_COUNT = 6;

const DELAY_MIN = 6123;
const DELAY_MAX = 6650;

function pakujZiola(api: PluginApi, bagCount = BAG_COUNT): void {
  api.command.send('otworz woreczki', false);
  for (let i = 1; i <= bagCount; i++) {
    api.command.send(`wloz ziola do ${i}. woreczka`, false);
  }
  api.command.send('zamknij woreczki', false);
}

export function setupZiolaAliases(api: PluginApi): () => void {
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
      const bagCount = matches?.[1] ? parseInt(matches[1], 10) : BAG_COUNT;
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

  // --- Herb interface aliases ---
  ids.push(registerTextAlias(api, /^hp\+$/i, '/zestaw hp'));
  ids.push(registerTextAlias(api, /^mana\+$/i, '/zestaw mana'));
  ids.push(registerTextAlias(api, /^obz$/i, '/ziola_pokaz'));
  ids.push(registerTextAlias(api, /^obz!$/i, '/ziola'));
  ids.push(registerTextAlias(api, /^st\+$/i, '/zestaw sterydy'));
  ids.push(registerTextAlias(api, /^zi$/i, '/zio_szukaj'));
  ids.push(registerTextAlias(api, /^zm\+$/i, '/zestaw zm'));

  ids.push(
    api.aliases.register(/^zisort!$/i, () => {
      api.command.send('wyj woreczki');
      api.command.send('/ziola');
      api.command.send('/ziola_buduj');
      api.command.send('/woreczki_buduj');
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

  return () => {
    ids.forEach((id) => api.aliases.remove(id));
  };
}
