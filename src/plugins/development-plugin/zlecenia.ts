import type { PluginApi } from '@arkadia/plugin-types';

const TAG = 'zlecenia';
let zlAliasId: string;
let zlBangAliasId: string;

export function setupZlecenia(api: PluginApi): void {
  zlAliasId = api.aliases.register(/^zl$/i, () => {
    api.command.send('zapytaj sprzedawce o zlecenie');
    return true;
  });

  zlBangAliasId = api.aliases.register(/^zl!$/i, () => {
    api.command.send('/zlecenia');
    return true;
  });

  api.triggers.register(
    /^(.+) mowi do ciebie: Na realizacje zamowienia mam /,
    (line) => {
      api.command.send('/zlecenia');
      return line;
    },
    TAG
  );
}

export function destroyZlecenia(api: PluginApi): void {
  api.aliases.remove(zlAliasId);
  api.aliases.remove(zlBangAliasId);
  api.triggers.removeByTag(TAG);
}
