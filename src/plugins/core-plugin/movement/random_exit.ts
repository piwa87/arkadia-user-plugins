import type { PluginApi } from '@arkadia/plugin-types';

export function setupRandomExitAlias(api: PluginApi): void {
  const dirToCmd: Record<string, string> = {
    north: 'n',
    south: 's',
    east: 'e',
    west: 'w',
    northeast: 'ne',
    northwest: 'nw',
    southeast: 'se',
    southwest: 'sw',
    up: 'u',
    down: 'd',
    in: 'in',
    out: 'out',
  };

  api.aliases.register(/^mran$/, () => {
    const room = api.map.getRoom();
    if (!room) {
      api.output.print('[mran] brak danych mapy');
      return true;
    }

    const exits = [
      ...Object.keys(room.exits).map((dir) => dirToCmd[dir] ?? dir),
      ...Object.keys(room.specialExits ?? {}),
    ];

    if (exits.length === 0) {
      api.output.print('[mran] brak wyjsc');
      return true;
    }

    const chosen = exits[Math.floor(Math.random() * exits.length)];
    api.command.send(chosen);
    return true;
  });
}
