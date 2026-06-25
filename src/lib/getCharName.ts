import type { PluginApi } from '@arkadia/plugin-types';

/** Current character's name, lowercased, or '' if not yet known via GMCP. */
export function getCharName(api: PluginApi): string {
  return (api.gmcp.get()?.char?.info?.name ?? '').toString().toLowerCase();
}

/**
 * Invoke `cb` with the lowercased character name as soon as it is known —
 * immediately if GMCP already has it, otherwise on the next GMCP update.
 *
 * Plugins can load before GMCP reports char identity. We listen to the generic
 * `gmcp` event (fires on *any* update — vitals ticks, room moves, etc.) rather
 * than the one-shot `gmcp.char.info`, so we still resolve the name even if
 * char.info was delivered before this listener was attached.
 *
 * `cb` runs at most once. Returns a cleanup function that removes the listener
 * if it is still pending.
 */
export function onCharName(api: PluginApi, cb: (name: string) => void): () => void {
  const known = getCharName(api);
  if (known) {
    cb(known);
    return () => {};
  }

  const handler = () => {
    const name = getCharName(api);
    if (!name) return;
    api.events.off('gmcp', handler);
    cb(name);
  };
  api.events.on('gmcp', handler);
  return () => api.events.off('gmcp', handler);
}
