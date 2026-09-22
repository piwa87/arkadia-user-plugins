import type { PluginApi } from '@arkadia/plugin-types';
import { createRoomDistanceLookup } from '../../../lib/mapDistance';
import { createMapPreviewController } from '../../../lib/mapPreview';
import { notify, requestPermission } from '../../../lib/notifications';
import { printOutputTable } from '../../../lib/outputTable';
import { getCharName, onCharName } from '../../../lib/getCharName';

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

export const WALKER_ROUTE_START_EVENT = 'walkerRoute.start';
export const WALKER_ROUTE_ARRIVED_EVENT = 'walkerRoute.arrived';
const WALKER_SETTLE_MS = 1_500;
const WALKER_MAX_RETRIES = 3;

interface LocationShortcut {
  key: string;
  id: number;
  label: string;
}

const ACTIVE_SHORTCUTS_KEY = 'shortcuts';
const SHORTCUTS_MIGRATION_KEY = 'p:walker:shortcuts:migrated';
const WALKER_FEEDBACK_COLOR = '#3f7255';

function printWalkerLine(api: PluginApi, message: string, color: string): void {
  const line = new api.AnsiAwareBuffer();
  line.append(message, api.colors.fromHex(color));
  api.output.print(line);
}

function printWalkerFeedback(api: PluginApi, message: string): void {
  printWalkerLine(api, message, WALKER_FEEDBACK_COLOR);
}

function characterShortcutsKey(character: string): string {
  return `p:walker:shortcuts:${character}`;
}

const ALT_EXIT_AREAS = new Set(['ziemie czaszki', 'pustkowia - okolice', 'pustkowia chaosu']);

function isInAltExitArea(api: PluginApi): boolean {
  const current = api.map.getRoom();
  if (!current) return false;

  const directAreaName = current.areaId?.trim().toLocaleLowerCase('pl-PL');
  if (directAreaName && ALT_EXIT_AREAS.has(directAreaName)) return true;

  const areas = api.map.getAreas();
  return (
    Array.isArray(areas) &&
    areas.some(
      (area) =>
        area.areaId === current.area && ALT_EXIT_AREAS.has(area.areaName.trim().toLocaleLowerCase('pl-PL')),
    )
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
  return typeof shortcut.key === 'string' && Number.isSafeInteger(shortcut.id) && typeof shortcut.label === 'string';
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
  return (
    getLocationShortcuts(api)?.find(
      (shortcut) => shortcut.key.toLocaleLowerCase('pl-PL') === key.toLocaleLowerCase('pl-PL'),
    ) ?? null
  );
}

function saveLocationShortcuts(api: PluginApi, shortcuts: LocationShortcut[], syncClient = true): boolean {
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
  const existingIndex = shortcuts.findIndex(
    (entry) => isLocationShortcut(entry) && entry.key.toLocaleLowerCase('pl-PL') === normalisedKey,
  );
  const label = customLabel?.trim() || current.name || String(current.id);
  const shortcut: LocationShortcut = { key, id: current.id, label };

  if (existingIndex === -1) shortcuts.push(shortcut);
  else {
    const existing = shortcuts[existingIndex];
    shortcuts[existingIndex] = existing && typeof existing === 'object' ? { ...existing, ...shortcut } : shortcut;
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
  const mapPreview = createMapPreviewController(api, {
    durationMs: 2_000,
    missingRoomMessage: '[walker] mapa nie zna biezacej lokacji',
  });

  const cleanupShortcutMigration = onCharName(api, () => {
    getLocationShortcuts(api);
  });
  const syncClientShortcuts = () => {
    getLocationShortcuts(api);
  };
  api.events.on('gmcp.char.info', syncClientShortcuts);

  // The client's built-in walker resets this to off on every client start, so
  // one enable per plugin session is enough — /walk is a toggle, not a set.
  let altExitWalkModeEnabled = false;
  const ensureAltExitWalkMode = () => {
    if (altExitWalkModeEnabled) return;
    void api.command.send('/walk');
    altExitWalkModeEnabled = true;
  };

  // Turn alt-exit search back off once the built-in walker's own trip
  // (started from walkToShortcut) reaches its destination.
  let builtInWalkerActive = false;
  let routeTargetId: number | null = null;
  let routeDelay = 2;
  let routeRetries = 0;
  let reportRouteArrival = false;
  let routeConfirmTimer: ReturnType<typeof setTimeout> | null = null;
  const clearRouteTimer = () => {
    if (routeConfirmTimer !== null) clearTimeout(routeConfirmTimer);
    routeConfirmTimer = null;
  };
  const turnOffAltExitMode = () => {
    if (!altExitWalkModeEnabled) return;
    void api.command.send('/walk');
    altExitWalkModeEnabled = false;
  };
  const finishRoute = (arrived: boolean) => {
    clearRouteTimer();
    const target = routeTargetId;
    routeTargetId = null;
    turnOffAltExitMode();
    if (arrived && reportRouteArrival && target !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (api.events as any).emit(WALKER_ROUTE_ARRIVED_EVENT, { roomId: target });
    }
    reportRouteArrival = false;
  };
  const getConfirmedRoomId = (): number | null => {
    const current = api.map.getRoom();
    const gmcp = api.gmcp.get() as { room?: { info?: { map?: { x?: unknown; y?: unknown; name?: unknown } } } };
    const position = gmcp.room?.info?.map;
    if (typeof position?.x !== 'number' || typeof position.y !== 'number' || typeof position.name !== 'string') {
      return current?.id ?? null;
    }
    const matches = (room: { x: number; y: number; name: string }) =>
      room.x === position.x && room.y === position.y && room.name === position.name;
    if (current && matches(current)) return current.id;
    const rooms = api.map.getAreas().flatMap((area) => area.rooms).filter(matches);
    if (rooms.length !== 1) return null;
    api.map.setLocation(rooms[0].id);
    return rooms[0].id;
  };
  const checkRouteAfterSettling = () => {
    routeConfirmTimer = null;
    const target = routeTargetId;
    if (target === null) return;
    const currentId = getConfirmedRoomId();
    if (currentId === target) {
      finishRoute(true);
      return;
    }
    const path = currentId === null ? null : api.map.findPath(currentId, target);
    if (routeRetries >= WALKER_MAX_RETRIES || !path || path.length < 2) {
      printWalkerFeedback(api, `[walker] nie dotarto do ${target}; obecna lokacja: ${currentId ?? 'nieznana'}`);
      finishRoute(false);
      return;
    }
    routeRetries += 1;
    printWalkerFeedback(api, `[walker] trasa urwala sie w ${currentId}; ponawiam do ${target} (${routeRetries}/${WALKER_MAX_RETRIES})`);
    void api.command.send(`/idz ${target} ${routeDelay}`);
  };
  const onBuiltInWalkerUpdate = (state: WalkerState) => {
    const arrived = builtInWalkerActive && !state.active && !state.paused;
    builtInWalkerActive = state.active && !state.paused;
    if (arrived && routeTargetId !== null) {
      clearRouteTimer();
      routeConfirmTimer = setTimeout(checkRouteAfterSettling, WALKER_SETTLE_MS);
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api.events as any).on('walker.update', onBuiltInWalkerUpdate);
  const onWalkerStop = () => {
    if (routeTargetId !== null) finishRoute(false);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api.events as any).on('walker.stop', onWalkerStop);

  // ZC/Pustkowia routes use the client walker with alt-exit search.
  const walkToShortcut = (shortcut: LocationShortcut, _startAutomatically = false) => {
    clearRouteTimer();
    routeTargetId = shortcut.id;
    routeRetries = 0;
    reportRouteArrival = false;
    if (isInAltExitArea(api)) {
      routeDelay = 0.5;
      ensureAltExitWalkMode();
      void api.command.send(`/prowadz ${shortcut.id}`);
      void api.command.send(`/idz ${shortcut.id} ${routeDelay}`);
      void api.command.send('/walkerw');
      return;
    }
    routeDelay = 2;
    void api.command.send(`/idz ${shortcut.id} ${routeDelay}`);
    void api.command.send('/walkerw');
  };

  const onWalkerRouteStart = (request: unknown) => {
    if (!request || typeof request !== 'object') return;
    const { roomId, automatic } = request as { roomId?: unknown; automatic?: unknown };
    if (!Number.isSafeInteger(roomId)) return;
    const target = roomId as number;
    if (automatic === false) {
      void api.command.send(`/prowadz ${target}`);
      return;
    }
    if (api.map.getRoom()?.id === target) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (api.events as any).emit(WALKER_ROUTE_ARRIVED_EVENT, { roomId: target });
      return;
    }
    walkToShortcut({ key: '', id: target, label: '' }, true);
    reportRouteArrival = true;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api.events as any).on(WALKER_ROUTE_START_EVENT, onWalkerRouteStart);

  const previewShortcut = (shortcut: LocationShortcut) => mapPreview.preview(shortcut.id);

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

    const getDistance = createRoomDistanceLookup(api.map, currentId);
    const rows = shortcuts
      .map((shortcut, savedIndex) => {
        const distance = getDistance(shortcut.id);
        return distance !== null || showAll
          ? {
              shortcut,
              savedIndex,
              distanceLabel: distance === null ? '-' : `${distance} lok.`,
            }
          : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort(
        (left, right) =>
          left.shortcut.key.localeCompare(right.shortcut.key, 'pl', { sensitivity: 'base' }) ||
          left.savedIndex - right.savedIndex,
      );

    if (rows.length === 0) {
      printWalkerFeedback(api, '[walker] brak skrotow polaczonych ladowa droga z obecna domena');
      return;
    }

    const leadLabel = '[ prowadz ]';
    const walkLabel = '[ idz ]';
    const previewLabel = '👁';
    const deleteLabel = '🗑';
    const borderColor = api.colors.fromHex('#777777');
    const rowColor = api.colors.fromHex('#929292');
    const shortcutColor = api.colors.fromHex('#2f855a');
    const leadColor = api.colors.fromHex('#4f8a65');
    const walkColor = api.colors.fromHex('#b08b57');
    const previewColor = api.colors.fromHex('#607d9b');
    const deleteColor = api.colors.fromHex('#8f4a4a');

    printOutputTable({
      api,
      rows,
      borderState: borderColor,
      rowState: () => rowColor,
      columns: [
        { cell: ({ shortcut }) => ({ text: shortcut.key, state: shortcutColor }) },
        { cell: ({ shortcut }) => ({ text: String(shortcut.id) }) },
        { align: 'right', cell: ({ distanceLabel }) => ({ text: distanceLabel }) },
        { cell: ({ shortcut }) => ({ text: shortcut.label }) },
        {
          cell: ({ shortcut }) => ({
            text: leadLabel,
            state: {
              ...leadColor,
              underline: true,
              hyperlink: {
                title: `/prowadz ${shortcut.id}`,
                onClick: () => { void api.command.send(`/prowadz ${shortcut.id}`); },
              },
            },
          }),
        },
        {
          cell: ({ shortcut }) => ({
            text: walkLabel,
            state: {
              ...walkColor,
              underline: true,
              hyperlink: {
                title: `wk ${shortcut.key}`,
                onClick: () => walkToShortcut(shortcut),
              },
            },
          }),
        },
        {
          cell: ({ shortcut }) => ({
            text: previewLabel,
            state: {
              ...previewColor,
              hyperlink: {
                title: `Podglad przez 2 sekundy: ${shortcut.label} (${shortcut.id})`,
                onClick: () => previewShortcut(shortcut),
              },
            },
          }),
        },
        {
          cell: ({ shortcut }) => ({
            text: deleteLabel,
            state: {
              ...deleteColor,
              hyperlink: {
                title: `Usun: ${shortcut.key} (${shortcut.id})`,
                onClick: () => removeShortcut(shortcut, showAll),
              },
            },
          }),
        },
      ],
    });
  };

  const commandHookId = api.commandHooks.register((command: string) => {
    const trimmed = command.trim();
    if (/^(?:\/stop|prr)$/i.test(trimmed) && routeTargetId !== null) finishRoute(false);
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

  return () => {
    cleanupShortcutMigration();
    mapPreview.dispose();
    clearRouteTimer();
    api.events.off('gmcp.char.info', syncClientShortcuts);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.events as any).off('walker.update', onBuiltInWalkerUpdate);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.events as any).off('walker.stop', onWalkerStop);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.events as any).off(WALKER_ROUTE_START_EVENT, onWalkerRouteStart);
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
