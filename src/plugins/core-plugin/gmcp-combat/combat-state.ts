import type { PluginApi, LocationObject } from '@arkadia/plugin-types';
import { col6 } from '../../../lib/colors/my-colors';
import { printBanner } from '../../../lib/printBanner';

export type { LocationObject };

export interface CombatState {
  inCombat: boolean;
  /** Current room objects, refreshed on every parsedObjects / parsedNums event. */
  objects: LocationObject[];
  /** attackerId → targetId */
  fightAttack: Map<number, number>;
  /** targetId → Set of attackerIds */
  fightAttackedBy: Map<number, Set<number>>;
}

const SWARM_THRESHOLD = 4;
const SWARM_ALERT_COOLDOWN = 5_000;

const COL_SWARM = col6;


export function createCombatState(): CombatState {
  return {
    inCombat: false,
    objects: [],
    fightAttack: new Map(),
    fightAttackedBy: new Map(),
  };
}

export function setupGmcpCombat(
  api: PluginApi,
  state: CombatState,
  onDarkness?: () => void,
): () => void {
  let lastSwarmAlert = 0;
  let prevInCombat = false;
  let prevCanSee = true;

  function recompute(): void {
    const locs = api.objects.getObjectsOnLocation();
    state.objects = locs;
    state.fightAttack.clear();
    state.fightAttackedBy.clear();

    let inCombat = false;
    let avatarId: number | null = null;

    for (const obj of locs) {
      if (obj.__category === 'player') {
        avatarId = obj.num;
        inCombat = obj.attack_num !== false && obj.attack_num != null;
      }
      const atk = obj.attack_num;
      if (atk !== false && atk != null && typeof atk === 'number') {
        state.fightAttack.set(obj.num, atk);
      }
    }
    state.inCombat = inCombat;

    for (const [attackerId, targetId] of state.fightAttack) {
      let set = state.fightAttackedBy.get(targetId);
      if (!set) {
        set = new Set();
        state.fightAttackedBy.set(targetId, set);
      }
      set.add(attackerId);
    }

    // printBanner disabled — state.inCombat is still updated above for external consumers
    prevInCombat = inCombat;

    // Darkness: read can_see_in_room from the raw GMCP cache using the avatar's object ID.
    if (avatarId != null && onDarkness) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gmcp = api.gmcp.get() as any;
      const canSee = gmcp?.objects?.data?.[avatarId]?.can_see_in_room !== false;
      if (!canSee && prevCanSee) onDarkness();
      prevCanSee = canSee;
    }

    const now = Date.now();
    if (now - lastSwarmAlert > SWARM_ALERT_COOLDOWN) {
      for (const obj of locs) {
        if (obj.__category !== 'team') continue;
        const attackers = state.fightAttackedBy.get(obj.num);
        if (attackers && attackers.size > SWARM_THRESHOLD) {
          const name = obj.desc ?? `#${obj.num}`;
          printBanner(
            api,
            `   O J O J O J !   ${name.toUpperCase()}   atakowany przez ${attackers.size} przeciwnikow!   `,
            COL_SWARM,
          );
          lastSwarmAlert = now;
          break;
        }
      }
    }
  }

  // parsedObjects (gmcp.objects.data) and parsedNums (gmcp.objects.nums) fire
  // on independent GMCP messages but usually arrive together in one batch —
  // coalesce to a single recompute per microtask instead of two full rebuilds.
  let recomputeQueued = false;
  let disposed = false;
  const queueRecompute = (): void => {
    if (recomputeQueued) return;
    recomputeQueued = true;
    queueMicrotask(() => {
      recomputeQueued = false;
      if (!disposed) recompute();
    });
  };

  api.events.on('parsedObjects', queueRecompute);
  api.events.on('parsedNums', queueRecompute);

  return () => {
    disposed = true;
    api.events.off('parsedObjects', queueRecompute);
    api.events.off('parsedNums', queueRecompute);
  };
}
