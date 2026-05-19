import type { PluginApi } from '@arkadia/plugin-types';

export function setupTeamSearch(api: PluginApi): () => void {
  const tag = 'ra:team-search';

  const onLost = (_line: any, matches: any) => {
    if (!matches) return _line;
    const name = matches[1];
    const room = api.map.getRoom();
    const location = room?.area || 'nieznana lokacja';
    const roomId = room?.id || '?';
    api.output.print(`\n<red>ZAGUBIONY: ${name}`);
    api.output.print(`<yellow> Lokacja: <white>${location} [id: ${roomId}]`);
    return _line;
  };

  api.triggers.register(/^(.*) gubi sie w terenie i nie nadaza za toba\.$/, onLost, tag);
  api.triggers.register(/^(.*) pozostaje w tyle nie mogac za toba nadazyc\.$/, onLost, tag);

  return () => {
    api.triggers.removeByTag(tag);
  };
}
