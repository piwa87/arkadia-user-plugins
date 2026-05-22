import type { PluginApi } from '@arkadia/plugin-types';

type LocationHighlighter = ReturnType<PluginApi['map']['createHighlighter']>;

export function setupMapAliases(api: PluginApi): void {
  const highlighters = new Map<string, LocationHighlighter>();
  const currentColor = new Map<number, string>();
  const previousColor = new Map<number, string>();

  const getOrCreate = (color: string): LocationHighlighter => {
    let h = highlighters.get(color);
    if (!h) {
      h = api.map.createHighlighter({ color });
      highlighters.set(color, h);
    }
    return h;
  };

  const setRoomColor = (id: number, color: string) => {
    const existing = currentColor.get(id);
    if (existing === color) return;
    if (existing) {
      previousColor.set(id, existing);
      highlighters.get(existing)?.remove(id);
    }
    getOrCreate(color).add(id);
    currentColor.set(id, color);
  };

  const removeRoomColor = (id: number) => {
    const existing = currentColor.get(id);
    if (!existing) return;
    highlighters.get(existing)?.remove(id);
    currentColor.delete(id);

    const prev = previousColor.get(id);
    if (prev) {
      previousColor.delete(id);
      getOrCreate(prev).add(id);
      currentColor.set(id, prev);
    }
  };

  const currentRoomId = () => api.map.getRoom()?.id;

  api.aliases.register(/^col3$/, () => { const id = currentRoomId(); if (id !== undefined) setRoomColor(id, 'orange'); return true; });
  api.aliases.register(/^col2$/, () => { const id = currentRoomId(); if (id !== undefined) setRoomColor(id, 'green'); return true; });
  api.aliases.register(/^col1$/, () => { const id = currentRoomId(); if (id !== undefined) setRoomColor(id, 'pink'); return true; });
  api.aliases.register(/^col0$/, () => { const id = currentRoomId(); if (id !== undefined) removeRoomColor(id); return true; });

  // ?hl <color>           — highlight current room
  // ?hl <color> <roomId>  — highlight specific room
  // ?hl remove [roomId]   — remove highlight (restores previous color)
  // ?hl clear             — destroy all highlights
  api.aliases.register(/^\?hl\s+(.+)$/, (matches) => {
    const args = matches?.[1]?.trim().split(/\s+/) ?? [];

    if (args[0] === 'clear') {
      for (const h of highlighters.values()) h.destroy();
      highlighters.clear();
      currentColor.clear();
      previousColor.clear();
      api.output.print('?hl: cleared all');
      return true;
    }

    if (args[0] === 'remove') {
      const id = args[1] ? Number(args[1]) : api.map.getRoom()?.id;
      if (id === undefined || isNaN(id)) {
        api.output.print('?hl: no room');
        return true;
      }
      removeRoomColor(id);
      return true;
    }

    const color = args[0];
    const id = args[1] ? Number(args[1]) : api.map.getRoom()?.id;

    if (id === undefined || isNaN(id)) {
      api.output.print('Usage: ?hl <color> [roomId]  |  ?hl remove [roomId]  |  ?hl clear');
      return true;
    }

    setRoomColor(id, color);
    return true;
  });
}
