import type { PluginApi } from '@arkadia/plugin-types';

const handlers = new WeakMap<PluginApi, Set<() => void>>();

/** Register a sequence's cancellation handler; unregister on plugin unload. */
export function registerSequenceStop(api: PluginApi, stop: () => void): () => void {
  let stops = handlers.get(api);
  if (!stops) { stops = new Set(); handlers.set(api, stops); }
  stops.add(stop);
  return () => { stops.delete(stop); };
}

export function stopSequences(api: PluginApi): void {
  handlers.get(api)?.forEach(stop => stop());
}
