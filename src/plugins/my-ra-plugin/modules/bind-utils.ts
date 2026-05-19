import type { PluginApi } from '@arkadia/plugin-types';

export interface DedupedBind {
  set(printable: string | null, callback?: () => void, clearAfterUse?: boolean): void;
  cleanup(): void;
}

export function createDedupedBind(api: PluginApi): DedupedBind {
  let current: string | null = null;

  const onEnterLocation = () => {
    current = null;
  };

  api.events.on('enterLocation', onEnterLocation);

  return {
    set(printable, callback?, clearAfterUse?) {
      if (printable !== null && printable === current) return;
      current = printable;
      api.bind.set(printable, callback, clearAfterUse);
    },
    cleanup: () => api.events.off('enterLocation', onEnterLocation),
  };
}
