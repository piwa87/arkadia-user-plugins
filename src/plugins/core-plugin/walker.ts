import type { PluginApi } from '@arkadia/plugin-types';
import { notify, requestPermission } from '../../lib/notifications';

const TAG_GATE = 'gate_knock';

const PL_TO_DIR: Record<string, string> = {
  'polnocny wschod': 'ne',
  'polnocny zachod': 'nw',
  'poludniowy wschod': 'se',
  'poludniowy zachod': 'sw',
  polnoc: 'n',
  poludnie: 's',
  wschod: 'e',
  zachod: 'w',
  gore: 'u',
  gora: 'u',
  dol: 'd',
};

// WalkerState is not yet in published plugin-types — define it locally
interface WalkerState {
  active: boolean;
  paused: boolean;
  path: number[];
  currentIndex: number;
  target: number | null;
  delay: number;
}

export function setupWalker(api: PluginApi): () => void {
  requestPermission();

  // ── Arrival notification ────────────────────────────────────────────────
  let prevActive = false;
  // "Walking" means actively auto-walking — a paused walker (e.g. after the
  // player takes manual control) does not count, so the gate is handled like a
  // manual move.
  let walkerWalking = false;
  let walkerDelay = 1;

  const onUpdate = (state: WalkerState) => {
    // Arrival: was walking, now inactive and not paused (path completed normally)
    const arrived = prevActive && !state.active && !state.paused;
    prevActive = state.active;
    walkerWalking = state.active && !state.paused;
    walkerDelay = state.delay;

    if (arrived) {
      notify('Walker: dotarłeś do celu');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api.events as any).on('walker.update', onUpdate);

  // ── Gate handling on a closed brama/wrota ───────────────────────────────
  // On a closed gate leading in a specific direction, behaviour depends on
  // whether the walker is auto-walking:
  //
  // 1. Walker active — open the gate right away (the knock) and slow the walking
  //    tempo (`/dalej 1.5`) until the next move completes, then restore the
  //    walker's own delay. The slower tempo gives the gate time to open before
  //    the walker steps through; the walker drives the movement itself.
  //
  // 2. Manual walking — arm a one-shot command hook on THAT direction (other
  //    directions are untouched). When the player heads in the gate direction,
  //    substitute the move with the knock only (gate opens, no step), then
  //    disarm. The next press of the direction walks through the now-open gate.
  //    A one-shot mapMove listener disarms the hook if the room is left another
  //    way (preventing a stale hook from hijacking the direction elsewhere).

  const armedDisarms = new Set<() => void>();

  api.triggers.register(
    /\bzamkniet.*\b(bram\w*|wrot\w*)\b.*\bprowadzac\w+\s+na\s+(polnocny[\s-]+wschod|polnocny[\s-]+zachod|poludniowy[\s-]+wschod|poludniowy[\s-]+zachod|polnoc|poludnie|wschod|zachod|gore|gora|dol)\b/i,
    (line, matches) => {
      const gateCmd = api.map.getRoom()?.userData?.['gate'];
      if (!gateCmd) return line;

      const plDir = matches?.[2]
        ?.trim()
        .replace(/[\s-]+/g, ' ')
        .toLowerCase();
      const dir = PL_TO_DIR[plDir ?? ''];
      if (!dir) return line;

      if (walkerWalking) {
        // Open the gate right away, and slow the tempo now, restoring the
        // walker's own delay after the move completes.
        api.command.send(String(gateCmd));
        const originalDelay = walkerDelay;
        api.command.send('/dalej 1.5');

        const restore = () => {
          api.events.off('mapMove', restore);
          armedDisarms.delete(restoreDisarm);
          api.command.send(`/dalej ${originalDelay}`);
        };
        const restoreDisarm = () => api.events.off('mapMove', restore);
        api.events.on('mapMove', restore);
        armedDisarms.add(restoreDisarm);

        return line;
      }

      // Manual: substitute the move with the knock; next press walks through.
      const ref = { id: '' };

      const disarm = () => {
        api.commandHooks.unregister(ref.id);
        api.events.off('mapMove', disarm);
        armedDisarms.delete(disarm);
      };

      ref.id = api.commandHooks.register((cmd: string) => {
        if (cmd === dir) {
          disarm();
          return String(gateCmd);
        }
        return undefined;
      });

      // Leaving the room another way cancels the armed hook.
      api.events.on('mapMove', disarm);
      armedDisarms.add(disarm);

      return line;
    },
    TAG_GATE,
  );

  return () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.events as any).off('walker.update', onUpdate);
    api.triggers.removeByTag(TAG_GATE);
    for (const disarm of [...armedDisarms]) disarm();
  };
}
