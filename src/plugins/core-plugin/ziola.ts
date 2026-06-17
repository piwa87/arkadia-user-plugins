import type { PluginApi } from '@arkadia/plugin-types';
import { withDelay } from '../../lib/withDelay';
import { notify } from '../../lib/notifications';

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
  ids.push(api.aliases.register(/^hp\+$/i, () => {
    api.command.send('/zestaw hp');
    return true;
  }));

  ids.push(api.aliases.register(/^mana\+$/i, () => {
    api.command.send('/zestaw mana');
    return true;
  }));

  ids.push(api.aliases.register(/^obz$/i, () => {
    api.command.send('/ziola_pokaz');
    return true;
  }));

  ids.push(api.aliases.register(/^obz!$/i, () => {
    api.command.send('/ziola');
    return true;
  }));

  ids.push(api.aliases.register(/^st\+$/i, () => {
    api.command.send('/zestaw sterydy');
    return true;
  }));

  ids.push(
    api.aliases.register(/^zi$/i, () => {
      api.command.send('/zio_szukaj');
      return true;
    }),
  );

  ids.push(api.aliases.register(/^zisort!$/i, () => {
    api.command.send('/ziola');
    api.command.send('/ziola_buduj');
    api.command.send('/woreczki_buduj');
    return true;
  }));

  ids.push(api.aliases.register(/^zm\+$/i, () => {
    api.command.send('/zestaw zm');
    return true;
  }));

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
