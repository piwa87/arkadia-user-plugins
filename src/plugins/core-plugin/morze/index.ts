import type { PluginApi } from '@arkadia/plugin-types';
import { registerSequenceStop } from '../../../lib/sequenceStop';
import { createMorzeState } from './state';
import { createMorzeActions } from './actions';
import { createMorzeRoute } from './route';
import { setupMorzeTriggers } from './triggers';
import { setupMorzeAliases } from './aliases';

export function setupMorze(api: PluginApi): () => void {
  const state = createMorzeState();
  const actions = createMorzeActions(api, state);
  const route = createMorzeRoute(api);
  const cleanupTriggers = setupMorzeTriggers(api, state, actions);
  const unregisterStop = registerSequenceStop(api, actions.stop);
  setupMorzeAliases(api, state, actions, route.nextDirection);
  api.events.on('client.disconnect', actions.stop);

  api.aliases.register(/^mr\+$/i, () => {
    state.enabled = true;
    api.output.print('[Morze] module enabled');
    return true;
  });
  api.aliases.register(/^mr-$/i, () => {
    actions.stop();
    state.enabled = false;
    api.output.print('[Morze] module disabled');
    return true;
  });

  return () => {
    actions.stop();
    state.enabled = false;
    unregisterStop();
    api.events.off('client.disconnect', actions.stop);
    route.cleanup();
    cleanupTriggers();
  };
}

export { createMorzeState };
export type { MorzeState } from './state';
