import type { PluginApi } from '@arkadia/plugin-types';
import { DIRECTION_COMMANDS } from '../../../lib/directions';

export function setupRandomExitAlias(api: PluginApi): void {
  api.aliases.register(/^mran$/, () => {
    const room = api.map.getRoom();
    if (!room) {
      api.output.print('[mran] brak danych mapy');
      return true;
    }

    const exits = [
      ...Object.keys(room.exits).map((dir) => DIRECTION_COMMANDS[dir] ?? dir),
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
