import type { PluginApi } from '@arkadia/plugin-types';
import { DIRECTION_COMMANDS } from '../../../lib/directions';

/** CMud's external next_dir is supplied by the client's marked map route. */
export function createMorzeRoute(api: PluginApi) {
  let paths: number[][] = [];
  const onPath = (data: { segments: Array<{ path: number[] }> } | null) => {
    paths = data?.segments.map(segment => [...segment.path]) ?? [];
  };
  api.events.on('mapPath', onPath);

  function nextDirection(): string | null {
    const room = api.map.getRoom();
    if (!room) return null;
    for (const path of paths) {
      const index = path.indexOf(room.id);
      if (index < 0 || index >= path.length - 1) continue;
      const next = path[index + 1];
      for (const [direction, id] of Object.entries(room.exits)) {
        if (id === next && DIRECTION_COMMANDS[direction]) return DIRECTION_COMMANDS[direction];
      }
      for (const [command, id] of Object.entries(room.specialExits ?? {})) {
        if (id === next) return command;
      }
      return null;
    }
    return null;
  }

  return { nextDirection, cleanup: () => api.events.off('mapPath', onPath) };
}
