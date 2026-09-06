import type { MapDirection, PluginApi, Room } from '@arkadia/plugin-types';
import { notify, requestPermission } from '../../lib/notifications';
import { getCharName, onCharName } from '../../lib/getCharName';

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

function setupStandardWalker(api: PluginApi): () => void {
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
      notify('Arrived 🏁');
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
    /\bzamkniet.*\b(bram\w*|wrot\w*|krat\w*|furtk\w*)\b.*\bprowadzac\w+\s+na\s+(polnocny[\s-]+wschod|polnocny[\s-]+zachod|poludniowy[\s-]+wschod|poludniowy[\s-]+zachod|polnoc|poludnie|wschod|zachod|gore|gora|dol)\b/i,
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

const ZC_MOVE_TIMEOUT_MS = 5_000;
const ZC_AUTO_DELAY_MS = 500;
export const DYNAMIC_WALKER_START_EVENT = 'dynamicWalker.start';
const ZC_HIDDEN_OPEN_EXITS: Readonly<Record<number, readonly MapDirection[]>> = {
  20841: ['north'],
  20842: ['south'],
};

const DIRECTION_TO_COMMAND: Record<MapDirection, string> = {
  north: 'n', south: 's', east: 'e', west: 'w',
  northeast: 'ne', northwest: 'nw', southeast: 'se', southwest: 'sw',
  up: 'u', down: 'd', in: 'in', out: 'out',
};

const DIRECTION_VECTORS: Partial<Record<MapDirection, readonly [number, number, number]>> = {
  north: [0, 1, 0],
  northeast: [1, 1, 0],
  east: [1, 0, 0],
  southeast: [1, -1, 0],
  south: [0, -1, 0],
  southwest: [-1, -1, 0],
  west: [-1, 0, 0],
  northwest: [-1, 1, 0],
  up: [0, 0, 1],
  down: [0, 0, -1],
};

const EXIT_ALIASES: Record<string, MapDirection> = {
  n: 'north', north: 'north', polnoc: 'north',
  s: 'south', south: 'south', poludnie: 'south',
  e: 'east', east: 'east', wschod: 'east',
  w: 'west', west: 'west', zachod: 'west',
  ne: 'northeast', northeast: 'northeast', 'polnocny-wschod': 'northeast',
  nw: 'northwest', northwest: 'northwest', 'polnocny-zachod': 'northwest',
  se: 'southeast', southeast: 'southeast', 'poludniowy-wschod': 'southeast',
  sw: 'southwest', southwest: 'southwest', 'poludniowy-zachod': 'southwest',
  u: 'up', up: 'up', gora: 'up', gore: 'up',
  d: 'down', down: 'down', dol: 'down',
  in: 'in', out: 'out',
};

interface LocationShortcut {
  key: string;
  id: number;
  label: string;
}

const ACTIVE_SHORTCUTS_KEY = 'shortcuts';
const SHORTCUTS_MIGRATION_KEY = 'p:walker:shortcuts:migrated';
const WALKER_FEEDBACK_COLOR = '#3f7255';
const WALKER_ALTERNATIVE_COLOR = '#8f4a4a';

function printWalkerLine(api: PluginApi, message: string, color: string): void {
  const line = new api.AnsiAwareBuffer();
  line.append(message, api.colors.fromHex(color));
  api.output.print(line);
}

function printWalkerFeedback(api: PluginApi, message: string): void {
  printWalkerLine(api, message, WALKER_FEEDBACK_COLOR);
}

function printStepDirection(api: PluginApi, selected: string, expected?: string): void {
  const directionColor = api.colors.fromHex(
    expected === undefined ? WALKER_FEEDBACK_COLOR : WALKER_ALTERNATIVE_COLOR,
  );
  const line = new api.AnsiAwareBuffer('--> ');
  line.append(selected, directionColor);
  if (expected !== undefined) {
    line.append(' (');
    line.append(expected, directionColor);
    line.append(')');
  }
  api.output.print(line);
}

function characterShortcutsKey(character: string): string {
  return `p:walker:shortcuts:${character}`;
}

interface RankedExit {
  direction: MapDirection;
  roomId: number;
  directionSimilarity: number;
  distanceSquared: number;
}

function normaliseExit(exit: string): MapDirection | undefined {
  return EXIT_ALIASES[exit.trim().toLowerCase().replace(/\s+/g, '-')];
}

export function squaredDistance(from: Room, target: Room): number {
  return (from.x - target.x) ** 2 + (from.y - target.y) ** 2 + (from.z - target.z) ** 2;
}

function directionSimilarity(left: MapDirection, right: MapDirection): number {
  const a = DIRECTION_VECTORS[left];
  const b = DIRECTION_VECTORS[right];
  if (!a || !b) return 0;

  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const magnitudeA = Math.hypot(...a);
  const magnitudeB = Math.hypot(...b);
  return dot / (magnitudeA * magnitudeB);
}

export function rankOpenExits(
  current: Room,
  target: Room,
  preferredDirection: MapDirection,
  openExitNames: readonly string[],
  getRoomById: (roomId: number) => Room | null,
): RankedExit[] {
  const openDirections = new Set(
    openExitNames.map(normaliseExit).filter((direction): direction is MapDirection => Boolean(direction)),
  );

  return (Object.entries(current.exits) as [MapDirection, number][])
    .filter(([direction]) => openDirections.has(direction))
    .map(([direction, roomId]) => {
      const room = getRoomById(roomId);
      return room
        ? {
            direction,
            roomId,
            directionSimilarity: directionSimilarity(preferredDirection, direction),
            distanceSquared: squaredDistance(room, target),
          }
        : null;
    })
    .filter((candidate): candidate is RankedExit => candidate !== null)
    .sort((left, right) =>
      right.directionSimilarity - left.directionSimilarity ||
      left.distanceSquared - right.distanceSquared,
    );
}

function getOpenExits(api: PluginApi): string[] | null {
  const gmcp = api.gmcp.get() as { room?: { info?: { exits?: unknown } } };
  const exits = gmcp.room?.info?.exits;
  return Array.isArray(exits) && exits.every((exit) => typeof exit === 'string') ? exits : null;
}

const DYNAMIC_WALKER_AREAS = new Set([
  'ziemie czaszki',
  'pustkowia - okolice',
  'pustkowia chaosu',
]);

function isInDynamicWalkerArea(api: PluginApi): boolean {
  const current = api.map.getRoom();
  if (!current) return false;

  const directAreaName = current.areaId?.trim().toLocaleLowerCase('pl-PL');
  if (directAreaName && DYNAMIC_WALKER_AREAS.has(directAreaName)) return true;

  const areas = api.map.getAreas();
  return Array.isArray(areas) && areas.some((area) =>
    area.areaId === current.area &&
    DYNAMIC_WALKER_AREAS.has(area.areaName.trim().toLocaleLowerCase('pl-PL')),
  );
}

function parseShortcutList(raw: string | null): LocationShortcut[] | null {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isLocationShortcut) : null;
  } catch {
    return null;
  }
}

function isLocationShortcut(entry: unknown): entry is LocationShortcut {
  if (!entry || typeof entry !== 'object') return false;
  const shortcut = entry as Partial<LocationShortcut>;
  return typeof shortcut.key === 'string' &&
    Number.isSafeInteger(shortcut.id) &&
    typeof shortcut.label === 'string';
}

function getLocationShortcuts(api: PluginApi): LocationShortcut[] | null {
  const character = getCharName(api);
  if (!character) return null;

  try {
    const characterKey = characterShortcutsKey(character);
    const saved = localStorage.getItem(characterKey);
    let shortcuts: LocationShortcut[] | null;

    if (saved !== null) {
      shortcuts = parseShortcutList(saved);
    } else if (localStorage.getItem(SHORTCUTS_MIGRATION_KEY) === null) {
      const legacyShortcuts = parseShortcutList(localStorage.getItem(ACTIVE_SHORTCUTS_KEY));
      if (!legacyShortcuts) return null;

      const serialisedLegacy = JSON.stringify(legacyShortcuts);
      localStorage.setItem(characterShortcutsKey('jens'), serialisedLegacy);
      localStorage.setItem(characterShortcutsKey('gertruda'), serialisedLegacy);
      localStorage.setItem(SHORTCUTS_MIGRATION_KEY, 'jens,gertruda');
      shortcuts = character === 'jens' || character === 'gertruda' ? legacyShortcuts : [];
    } else {
      shortcuts = [];
    }

    if (!shortcuts) return null;
    const serialised = JSON.stringify(shortcuts);
    localStorage.setItem(characterKey, serialised);
    localStorage.setItem(ACTIVE_SHORTCUTS_KEY, serialised);
    return shortcuts;
  } catch {
    return null;
  }
}

function getLocationShortcut(api: PluginApi, key: string): LocationShortcut | null {
  return getLocationShortcuts(api)?.find(
    (shortcut) => shortcut.key.toLocaleLowerCase('pl-PL') === key.toLocaleLowerCase('pl-PL'),
  ) ?? null;
}

function saveLocationShortcuts(
  api: PluginApi,
  shortcuts: LocationShortcut[],
  syncClient = true,
): boolean {
  const character = getCharName(api);
  if (!character) return false;

  try {
    const serialised = JSON.stringify(shortcuts);
    localStorage.setItem(characterShortcutsKey(character), serialised);
    if (syncClient) localStorage.setItem(ACTIVE_SHORTCUTS_KEY, serialised);
    return true;
  } catch {
    return false;
  }
}

function withActiveClientShortcut(api: PluginApi, shortcut: LocationShortcut, action: () => void): void {
  const shortcuts = getLocationShortcuts(api);
  if (!shortcuts?.some(
    (saved) => saved.key.toLocaleLowerCase('pl-PL') === shortcut.key.toLocaleLowerCase('pl-PL') &&
      saved.id === shortcut.id,
  )) {
    printWalkerFeedback(api, '[walker] nie udalo sie przygotowac skrotu dla komendy klienta');
    return;
  }
  action();
}

function saveCurrentLocationShortcut(api: PluginApi, key: string, customLabel?: string): void {
  const current = api.map.getRoom();
  if (!current) {
    printWalkerFeedback(api, '[walker] brak aktualnej lokacji na mapie');
    return;
  }

  const shortcuts = getLocationShortcuts(api);
  if (!shortcuts) {
    printWalkerFeedback(api, '[walker] brak nazwy postaci albo nie udalo sie odczytac skrotow');
    return;
  }

  const normalisedKey = key.toLocaleLowerCase('pl-PL');
  const existingIndex = shortcuts.findIndex((entry) =>
    isLocationShortcut(entry) && entry.key.toLocaleLowerCase('pl-PL') === normalisedKey,
  );
  const label = customLabel?.trim() || current.name || String(current.id);
  const shortcut: LocationShortcut = { key, id: current.id, label };

  if (existingIndex === -1) shortcuts.push(shortcut);
  else {
    const existing = shortcuts[existingIndex];
    shortcuts[existingIndex] = existing && typeof existing === 'object'
      ? { ...existing, ...shortcut }
      : shortcut;
  }

  if (saveLocationShortcuts(api, shortcuts, false)) {
    const action = existingIndex === -1 ? 'zapisano' : 'zaktualizowano';
    const clientName = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    void api.command.send(`/dodaj_skrot ${current.id} "${clientName}" ${label}`);
    saveLocationShortcuts(api, shortcuts);
    printWalkerFeedback(api, `[walker] ${action} skrot ${key}: ${label} (${current.id})`);
  } else {
    printWalkerFeedback(api, '[walker] nie udalo sie zapisac localStorage.shortcuts');
  }
}

function setupZcAndShortcutWalker(api: PluginApi): () => void {
  let targetId: number | null = null;
  let waitingFromRoomId: number | null = null;
  let autoWalking = false;
  let moveTimeout: ReturnType<typeof setTimeout> | null = null;
  let confirmTimer: ReturnType<typeof setTimeout> | null = null;
  let stepTimer: ReturnType<typeof setTimeout> | null = null;
  let previewTimer: ReturnType<typeof setTimeout> | null = null;
  let previewOriginId: number | null = null;
  let recentRoomIds: number[] = [];

  const cleanupShortcutMigration = onCharName(api, () => {
    getLocationShortcuts(api);
  });
  const syncClientShortcuts = () => {
    getLocationShortcuts(api);
  };
  api.events.on('gmcp.char.info', syncClientShortcuts);

  const clearTimers = () => {
    if (moveTimeout !== null) clearTimeout(moveTimeout);
    if (confirmTimer !== null) clearTimeout(confirmTimer);
    if (stepTimer !== null) clearTimeout(stepTimer);
    moveTimeout = null;
    confirmTimer = null;
    stepTimer = null;
  };

  const disableAutoWalking = () => {
    autoWalking = false;
    if (stepTimer !== null) clearTimeout(stepTimer);
    stepTimer = null;
  };

  const stop = (message?: string) => {
    clearTimers();
    autoWalking = false;
    targetId = null;
    waitingFromRoomId = null;
    recentRoomIds = [];
    if (message) printWalkerFeedback(api, `[zc] ${message}`);
  };

  const arrive = (room: Room) => {
    stop(`dotarto do ${room.id} (${room.name})`);
    notify('Arrived 🏁');
  };

  const detectTwoRoomLoop = (roomId: number): boolean => {
    recentRoomIds.push(roomId);
    if (recentRoomIds.length > 5) recentRoomIds.shift();
    if (
      recentRoomIds.length !== 5 ||
      recentRoomIds[0] !== recentRoomIds[2] ||
      recentRoomIds[0] !== recentRoomIds[4] ||
      recentRoomIds[1] !== recentRoomIds[3] ||
      recentRoomIds[0] === recentRoomIds[1]
    ) {
      return false;
    }

    disableAutoWalking();
    printWalkerLine(
      api,
      `[zc] petla ${recentRoomIds[0]} <-> ${recentRoomIds[1]}; automat zatrzymany, cel pozostaje ustawiony`,
      WALKER_ALTERNATIVE_COLOR,
    );
    return true;
  };

  const takeNextStep = () => {
    if (targetId === null) {
      disableAutoWalking();
      printWalkerFeedback(api, '[zc] brak celu; uzyj wk <skrot> albo /zcwalk <ID-lokacji>');
      return;
    }
    if (waitingFromRoomId !== null) {
      printWalkerFeedback(api, `[zc] czekam na potwierdzenie ruchu z lokacji ${waitingFromRoomId}`);
      return;
    }

    const current = api.map.getRoom();
    const target = api.map.getRoomById(targetId);
    if (!current || !target) {
      disableAutoWalking();
      printWalkerFeedback(api, '[zc] brak danych mapy o obecnej lokacji albo celu');
      return;
    }
    if (current.id === target.id) {
      stop(`dotarto do ${target.id} (${target.name})`);
      return;
    }

    const path = api.map.findPath(current.id, target.id);
    if (!path) {
      disableAutoWalking();
      printWalkerFeedback(api, `[zc] findPath: brak trasy z ${current.id} do ${target.id}`);
      return;
    }

    const nextRoomId = path[0] === current.id ? path[1] : path[0];
    const preferredDirection = (Object.entries(current.exits) as [MapDirection, number][])
      .find(([, roomId]) => roomId === nextRoomId)?.[0];
    const specialCommand = nextRoomId === undefined
      ? undefined
      : Object.entries(current.specialExits ?? {}).find(([, roomId]) => roomId === nextRoomId)?.[0];
    if (nextRoomId === undefined || (!preferredDirection && !specialCommand)) {
      disableAutoWalking();
      printWalkerFeedback(api, `[zc] findPath: nie umiem ustalic pierwszego kierunku z ${current.id} do ${target.id}`);
      return;
    }

    const preferredCommand = preferredDirection ? DIRECTION_TO_COMMAND[preferredDirection] : specialCommand!;
    const openExits = getOpenExits(api);
    const hiddenOpenExits = ZC_HIDDEN_OPEN_EXITS[current.id] ?? [];
    if (!openExits && hiddenOpenExits.length === 0 && !specialCommand) {
      disableAutoWalking();
      printWalkerFeedback(api, '[zc] GMCP nie podal aktualnych wyjsc; nie wykonuje ruchu w ciemno');
      return;
    }

    const availableExitNames = [...(openExits ?? []), ...hiddenOpenExits];
    const openDirections = new Set(
      availableExitNames.map(normaliseExit).filter((direction): direction is MapDirection => Boolean(direction)),
    );
    let selectedCommand: string;

    if (preferredDirection && openDirections.has(preferredDirection)) {
      selectedCommand = preferredCommand;
      printStepDirection(api, preferredCommand);
    } else if (specialCommand) {
      selectedCommand = specialCommand;
      printStepDirection(api, specialCommand);
    } else {
      const alternative = rankOpenExits(
        current,
        target,
        preferredDirection!,
        availableExitNames,
        (id) => api.map.getRoomById(id),
      )[0];
      if (!alternative) {
        disableAutoWalking();
        printWalkerFeedback(api, '[zc] brak dostepnego, znanego mapie kierunku alternatywnego');
        return;
      }

      const alternativeCommand = DIRECTION_TO_COMMAND[alternative.direction];
      selectedCommand = alternativeCommand;
      printStepDirection(api, alternativeCommand, preferredCommand);
    }

    waitingFromRoomId = current.id;
    void api.command.send(selectedCommand);
    moveTimeout = setTimeout(() => {
      moveTimeout = null;
      waitingFromRoomId = null;
      disableAutoWalking();
      printWalkerFeedback(api, `[zc] brak potwierdzenia ruchu przez ${selectedCommand}; cel pozostaje ustawiony`);
    }, ZC_MOVE_TIMEOUT_MS);
  };

  const onRoomInfo = () => {
    if (targetId === null || waitingFromRoomId === null || confirmTimer !== null) return;
    confirmTimer = setTimeout(() => {
      confirmTimer = null;
      const confirmedRoom = api.map.getRoom();
      if (!confirmedRoom || confirmedRoom.id === waitingFromRoomId) return;

      waitingFromRoomId = null;
      if (moveTimeout !== null) clearTimeout(moveTimeout);
      moveTimeout = null;
      if (targetId !== null && confirmedRoom.id === targetId) {
        arrive(confirmedRoom);
      } else if (autoWalking) {
        if (detectTwoRoomLoop(confirmedRoom.id)) return;
        stepTimer = setTimeout(() => {
          stepTimer = null;
          takeNextStep();
        }, ZC_AUTO_DELAY_MS);
      }
    }, 0);
  };
  api.events.on('gmcp.room.info', onRoomInfo);

  const startZcWalking = (id: number, label?: string) => {
    // Walker events are present in the client but not yet in published plugin-types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.events as any).emit('walker.stop');
    clearTimers();
    autoWalking = false;
    targetId = id;
    recentRoomIds = [];
    const currentRoomId = api.map.getRoom()?.id;
    if (currentRoomId !== undefined) recentRoomIds.push(currentRoomId);
    const target = label ? `${label} (${id})` : String(id);
    printWalkerFeedback(api, `[zc] ustawiono cel: ${target}; step! = krok, step!! = auto i5`);
  };

  const startAutoWalking = () => {
    autoWalking = true;
    takeNextStep();
  };

  const walkToShortcut = (shortcut: LocationShortcut, startAutomatically = false) => {
    if (isInDynamicWalkerArea(api)) {
      startZcWalking(shortcut.id, shortcut.label);
      if (startAutomatically) startAutoWalking();
      return;
    }
    if (targetId !== null) stop();
    withActiveClientShortcut(api, shortcut, () => {
      void api.command.send(`/idz ${shortcut.key} 2`);
      void api.command.send('/walkerw');
    });
  };

  const onDynamicWalkerStart = (request: unknown) => {
    if (!request || typeof request !== 'object') return;
    const { roomId, label, automatic } = request as {
      roomId?: unknown;
      label?: unknown;
      automatic?: unknown;
    };
    if (!Number.isSafeInteger(roomId)) return;

    startZcWalking(roomId as number, typeof label === 'string' ? label : undefined);
    if (automatic === true) startAutoWalking();
  };
  // Custom core-plugin event; not present in the published plugin-types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api.events as any).on(DYNAMIC_WALKER_START_EVENT, onDynamicWalkerStart);

  const previewShortcut = (shortcut: LocationShortcut) => {
    if (previewTimer === null) {
      const currentId = api.map.getRoom()?.id;
      if (currentId === undefined) {
        printWalkerFeedback(api, '[walker] mapa nie zna biezacej lokacji');
        return;
      }
      previewOriginId = currentId;
    } else {
      clearTimeout(previewTimer);
    }

    void api.command.send(`/ustaw ${shortcut.id}`);
    previewTimer = setTimeout(() => {
      previewTimer = null;
      const originId = previewOriginId;
      previewOriginId = null;
      if (originId !== null) void api.command.send(`/ustaw ${originId}`);
    }, 2_000);
  };

  const removeShortcut = (shortcut: LocationShortcut, showAll: boolean) => {
    const shortcuts = getLocationShortcuts(api);
    if (!shortcuts) {
      printWalkerFeedback(api, '[walker] brak nazwy postaci albo nie udalo sie odczytac skrotow');
      return;
    }

    const remaining = shortcuts.filter(
      (saved) => saved.key.toLocaleLowerCase('pl-PL') !== shortcut.key.toLocaleLowerCase('pl-PL'),
    );
    if (!saveLocationShortcuts(api, remaining)) {
      printWalkerFeedback(api, '[walker] nie udalo sie zapisac localStorage.shortcuts');
      return;
    }

    printWalkerFeedback(api, `[walker] usunieto skrot ${shortcut.key}: ${shortcut.label} (${shortcut.id})`);
    printShortcuts(showAll);
  };

  const printShortcuts = (showAll = false) => {
    const shortcuts = getLocationShortcuts(api);
    if (!shortcuts) {
      printWalkerFeedback(api, '[walker] brak nazwy postaci albo nie udalo sie odczytac skrotow');
      return;
    }
    if (shortcuts.length === 0) {
      printWalkerFeedback(api, '[walker] brak zapisanych skrotow');
      return;
    }

    const currentId = api.map.getRoom()?.id;
    if (currentId === undefined) {
      printWalkerFeedback(api, '[walker] mapa nie zna biezacej lokacji');
      return;
    }

    const rows = shortcuts
      .map((shortcut, savedIndex) => {
        const path = currentId === shortcut.id ? [currentId] : api.map.findPath(currentId, shortcut.id);
        return path || showAll
          ? {
              shortcut,
              savedIndex,
              distanceLabel: path ? `${Math.max(0, path.length - 1)} lok.` : '-',
            }
          : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((left, right) =>
        left.shortcut.key.localeCompare(right.shortcut.key, 'pl', { sensitivity: 'base' }) ||
        left.savedIndex - right.savedIndex,
      );

    if (rows.length === 0) {
      printWalkerFeedback(api, '[walker] brak skrotow polaczonych ladowa droga z obecna domena');
      return;
    }

    const keyWidth = Math.max(...rows.map(({ shortcut }) => shortcut.key.length));
    const idWidth = Math.max(...rows.map(({ shortcut }) => String(shortcut.id).length));
    const distanceWidth = Math.max(...rows.map(({ distanceLabel }) => distanceLabel.length));
    const labelWidth = Math.max(...rows.map(({ shortcut }) => shortcut.label.length));
    const leadLabel = '[ prowadz ]';
    const walkLabel = '[ idz ]';
    const previewLabel = '👁';
    const deleteLabel = '🗑';
    const border = [keyWidth, idWidth, distanceWidth, labelWidth, leadLabel.length, walkLabel.length, previewLabel.length, deleteLabel.length]
      .map((width) => `+${'-'.repeat(width + 2)}`)
      .join('') + '+';
    const borderColor = api.colors.fromHex('#777777');
    const rowColor = api.colors.fromHex('#929292');
    const shortcutColor = api.colors.fromHex('#2f855a');
    const leadColor = api.colors.fromHex('#4f8a65');
    const walkColor = api.colors.fromHex('#b08b57');
    const previewColor = api.colors.fromHex('#607d9b');
    const deleteColor = api.colors.fromHex('#8f4a4a');

    const printBorder = () => {
      const line = new api.AnsiAwareBuffer(border);
      line.color([0, border.length], borderColor);
      api.output.print(line);
    };

    printBorder();
    for (const { shortcut, distanceLabel } of rows) {
      const line = new api.AnsiAwareBuffer();
      line.append('| ', rowColor);
      line.append(shortcut.key, shortcutColor);
      line.append(`${' '.repeat(keyWidth - shortcut.key.length)} | `, rowColor);
      line.append(
        `${String(shortcut.id).padEnd(idWidth)} | ${distanceLabel.padStart(distanceWidth)} | ${shortcut.label.padEnd(labelWidth)} | `,
        rowColor,
      );
      line.append(leadLabel, {
        ...leadColor,
        underline: true,
        hyperlink: {
          title: `/prowadz ${shortcut.key}`,
          onClick: () => withActiveClientShortcut(api, shortcut, () => {
            void api.command.send(`/prowadz ${shortcut.key}`);
          }),
        },
      });
      line.append(' | ', rowColor);
      line.append(walkLabel, {
        ...walkColor,
        underline: true,
        hyperlink: {
          title: `wk ${shortcut.key}`,
          onClick: () => walkToShortcut(shortcut),
        },
      });
      line.append(' | ', rowColor);
      line.append(previewLabel, {
        ...previewColor,
        hyperlink: {
          title: `Podglad przez 2 sekundy: ${shortcut.label} (${shortcut.id})`,
          onClick: () => previewShortcut(shortcut),
        },
      });
      line.append(' | ', rowColor);
      line.append(deleteLabel, {
        ...deleteColor,
        hyperlink: {
          title: `Usun: ${shortcut.key} (${shortcut.id})`,
          onClick: () => removeShortcut(shortcut, showAll),
        },
      });
      line.append(' |', rowColor);
      api.output.print(line);
    }
    printBorder();
  };

  const commandHookId = api.commandHooks.register((command: string) => {
    const trimmed = command.trim();
    if (/^prr$/i.test(trimmed) && targetId !== null) {
      stop('zatrzymano');
      return undefined;
    }

    if (/^wk$/i.test(trimmed)) {
      printShortcuts();
      return null;
    }

    if (/^wk_all$/i.test(trimmed)) {
      printShortcuts(true);
      return null;
    }

    const addMatch = trimmed.match(/^wk\+\s+(\S+)(?:\s+(.+))?$/i);
    if (addMatch) {
      saveCurrentLocationShortcut(api, addMatch[1], addMatch[2]);
      return null;
    }

    const autoWalkMatch = trimmed.match(/^wk\s+(\S+)\s+!$/i);
    if (autoWalkMatch) {
      const shortcut = getLocationShortcut(api, autoWalkMatch[1]);
      if (!shortcut) {
        printWalkerFeedback(api, `[walker] nieznany skrot: ${autoWalkMatch[1]}`);
        return null;
      }
      walkToShortcut(shortcut, true);
      return null;
    }

    const walkMatch = trimmed.match(/^wk\s+(\S+)$/i);
    if (walkMatch) {
      const shortcut = getLocationShortcut(api, walkMatch[1]);
      if (!shortcut) {
        printWalkerFeedback(api, `[walker] nieznany skrot: ${walkMatch[1]}`);
        return null;
      }
      walkToShortcut(shortcut);
      return null;
    }

    return undefined;
  }, 100);

  api.aliases.register(/^\/zcwalk\s+(\d+)$/i, (matches) => {
    const id = Number(matches?.[1]);
    if (!Number.isSafeInteger(id)) {
      printWalkerFeedback(api, '[zc] uzycie: /zcwalk <ID-lokacji>');
      return true;
    }
    startZcWalking(id);
    return true;
  });

  api.aliases.register(/^\/zcstop$/i, () => {
    stop('zatrzymano');
    return true;
  });

  api.aliases.register(/^step!$/i, () => {
    disableAutoWalking();
    takeNextStep();
    return true;
  });

  api.aliases.register(/^step!!$/i, () => {
    startAutoWalking();
    return true;
  });

  return () => {
    cleanupShortcutMigration();
    clearTimers();
    if (previewTimer !== null) clearTimeout(previewTimer);
    previewTimer = null;
    previewOriginId = null;
    autoWalking = false;
    targetId = null;
    waitingFromRoomId = null;
    recentRoomIds = [];
    api.events.off('gmcp.room.info', onRoomInfo);
    api.events.off('gmcp.char.info', syncClientShortcuts);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.events as any).off(DYNAMIC_WALKER_START_EVENT, onDynamicWalkerStart);
    api.commandHooks.unregister(commandHookId);
  };
}

export function setupWalker(api: PluginApi): () => void {
  const cleanupStandardWalker = setupStandardWalker(api);
  const cleanupZcAndShortcutWalker = setupZcAndShortcutWalker(api);
  return () => {
    cleanupZcAndShortcutWalker();
    cleanupStandardWalker();
  };
}
