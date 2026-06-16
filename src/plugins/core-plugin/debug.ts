import type { PluginApi } from '@arkadia/plugin-types';

export function setupDebugAliases(api: PluginApi): void {
  const printJson = (label: string, data: unknown) => {
    const json = JSON.stringify(data, null, 2);
    api.output.print(`--- ${label} ---`);
    for (const line of json.split('\n')) {
      api.output.print(line);
    }
    api.output.print(`--- end ---`);
  };

  // ?map          → current room
  // ?map <id>     → room by numeric ID
  api.aliases.register(/^\?map(?:\s+(\d+))?$/, (matches) => {
    const idStr = matches?.[1];
    if (idStr) {
      const room = api.map.getRoomById(Number(idStr));
      if (!room) {
        api.output.print(`?map: no room found with id ${idStr}`);
      } else {
        printJson(`Room #${idStr}`, room);
      }
    } else {
      const room = api.map.getRoom();
      if (!room) {
        api.output.print('?map: no current room (map not loaded?)');
      } else {
        printJson(`Current room #${room.id}`, room);
      }
    }
    return true;
  });

  // ?gmcp         → full GMCP state
  // ?gmcp <path>  → nested path, e.g. "?gmcp char.state"
  api.aliases.register(/^\?gmcp(?:\s+(.+))?$/, (matches) => {
    const path = matches?.[1]?.trim();
    const state = api.gmcp.get();

    if (!path) {
      printJson('GMCP state', state);
    } else {
      const parts = path.split('.');
      let value: unknown = state;
      for (const part of parts) {
        if (value == null || typeof value !== 'object') {
          value = undefined;
          break;
        }
        value = (value as Record<string, unknown>)[part];
      }
      if (value === undefined) {
        api.output.print(`?gmcp: path "${path}" not found`);
      } else {
        printJson(`GMCP: ${path}`, value);
      }
    }
    return true;
  });
}
