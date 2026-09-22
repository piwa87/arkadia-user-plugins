import type { PluginApi } from '@arkadia/plugin-types';
import { createRoomDistanceLookup } from '../../../lib/mapDistance';
import { createMapPreviewController } from '../../../lib/mapPreview';
import { printOutputTable } from '../../../lib/outputTable';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import {
  WALKER_ROUTE_ARRIVED_EVENT,
  WALKER_ROUTE_START_EVENT,
} from '../movement/walker';
import { createTroView, type TroViewRow } from './view';

export const TRO_STORAGE_KEY = 'mobLocations';
const TRO_DEFAULT_ROW_LIMIT = 30;
const VISIBLE_MOB_TYPES = new Set(['pbt', 'besti']);
const TAG_TRO = 'tro';

export interface MobLocation {
  active: string;
  mobType: string;
  roomId: number;
  time: number;
  [key: string]: unknown;
}

interface MobRow {
  stored: StoredMobLocation;
  sourceIndex: number;
  distance: number | null;
}

interface StoredMobLocation {
  storageKey: string | null;
  entry: MobLocation;
}

type MobLocationStore =
  | { kind: 'record'; raw: Record<string, unknown>; locations: StoredMobLocation[] }
  | { kind: 'array'; raw: unknown[]; locations: StoredMobLocation[] };

function isMobLocation(value: unknown): value is MobLocation {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<MobLocation>;
  return (
    (entry.active === '0' || entry.active === '1') &&
    typeof entry.mobType === 'string' &&
    entry.mobType.trim().length > 0 &&
    Number.isSafeInteger(entry.roomId) &&
    typeof entry.time === 'number' &&
    Number.isFinite(entry.time)
  );
}

function loadMobLocationStore(): MobLocationStore {
  try {
    const raw = localStorage.getItem(TRO_STORAGE_KEY);
    if (raw === null) return { kind: 'record', raw: {}, locations: [] };
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return {
        kind: 'array',
        raw: parsed,
        locations: parsed.flatMap((entry) => (isMobLocation(entry) ? [{ storageKey: null, entry }] : [])),
      };
    }
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      return {
        kind: 'record',
        raw: record,
        locations: Object.entries(record).flatMap(([storageKey, entry]) =>
          isMobLocation(entry) ? [{ storageKey, entry }] : [],
        ),
      };
    }
  } catch {
    // Malformed or inaccessible client storage behaves like an empty store.
  }
  return { kind: 'record', raw: {}, locations: [] };
}

export function loadMobLocations(): MobLocation[] {
  return loadMobLocationStore().locations.map(({ entry }) => entry);
}

function saveMobLocationStore(store: MobLocationStore): void {
  localStorage.setItem(TRO_STORAGE_KEY, JSON.stringify(store.raw));
}

function isSameMobLocation(entry: MobLocation, selected: MobLocation): boolean {
  return entry.roomId === selected.roomId && entry.mobType === selected.mobType && entry.time === selected.time;
}

function normalizedMobType(entry: MobLocation): string {
  return entry.mobType.trim().toLocaleLowerCase('pl-PL');
}

function getOrderedRows(api: PluginApi): MobRow[] {
  const currentId = api.map.getRoom()?.id;
  const getDistance = currentId === undefined
    ? () => null
    : createRoomDistanceLookup(api.map, currentId);
  return loadMobLocationStore()
    .locations.filter(({ entry }) => VISIBLE_MOB_TYPES.has(normalizedMobType(entry)))
    .map((stored, sourceIndex) => ({
      stored,
      sourceIndex,
      distance: getDistance(stored.entry.roomId),
    }))
    .sort(
      (left, right) =>
        (left.distance ?? Number.POSITIVE_INFINITY) - (right.distance ?? Number.POSITIVE_INFINITY) ||
        left.sourceIndex - right.sourceIndex,
    );
}

function startWalkerRoute(api: PluginApi, entry: MobLocation, automatic = true): void {
  // Custom event shared inside core-plugin; absent from the published event union.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api.events as any).emit(WALKER_ROUTE_START_EVENT, automatic
    ? { roomId: entry.roomId }
    : { roomId: entry.roomId, automatic: false });
}

function mutateStoredEntry(api: PluginApi, selected: StoredMobLocation, mutation: 'toggle' | 'remove' | 'kill'): void {
  const freshStore = loadMobLocationStore();
  let current: MobLocation | null = null;
  let arrayIndex = -1;

  if (freshStore.kind === 'record' && selected.storageKey !== null) {
    const candidate = freshStore.raw[selected.storageKey];
    if (isMobLocation(candidate) && isSameMobLocation(candidate, selected.entry)) current = candidate;
  } else if (freshStore.kind === 'array') {
    arrayIndex = freshStore.raw.findIndex(
      (candidate) => isMobLocation(candidate) && isSameMobLocation(candidate, selected.entry),
    );
    if (arrayIndex !== -1) current = freshStore.raw[arrayIndex] as MobLocation;
  }

  if (current === null) {
    api.output.print('[tro] Wpis zostal juz zmieniony albo usuniety.');
    return;
  }

  if (mutation === 'kill' && current.active === '0') return;

  try {
    if (mutation === 'toggle' || mutation === 'kill') {
      const updated = { ...current, active: mutation === 'kill' ? '0' : current.active === '1' ? '0' : '1' };
      if (freshStore.kind === 'record') freshStore.raw[selected.storageKey!] = updated;
      else freshStore.raw[arrayIndex] = updated;
    } else {
      if (freshStore.kind === 'record') delete freshStore.raw[selected.storageKey!];
      else freshStore.raw.splice(arrayIndex, 1);
    }
    saveMobLocationStore(freshStore);
    if (mutation === 'remove') {
      api.output.print(`[tro] Usunieto ${selected.entry.mobType} z lokacji ${selected.entry.roomId}.`);
    } else if (mutation === 'kill') {
      api.output.print(`[tro] Oznaczono jako zabitego: ${selected.entry.mobType} (${selected.entry.roomId}).`);
    }
  } catch {
    api.output.print('[tro] Nie udalo sie zapisac zmian w mobLocations.');
  }
}

function reviveAllVisibleMobs(api: PluginApi): void {
  const store = loadMobLocationStore();
  let revived = 0;

  for (const stored of store.locations) {
    const { entry, storageKey } = stored;
    if (entry.active !== '0' || !VISIBLE_MOB_TYPES.has(normalizedMobType(entry))) continue;

    const updated = { ...entry, active: '1' };
    if (store.kind === 'record' && storageKey !== null) store.raw[storageKey] = updated;
    else if (store.kind === 'array') {
      const index = store.raw.indexOf(entry);
      if (index !== -1) store.raw[index] = updated;
    }
    revived += 1;
  }

  if (revived === 0) return;

  try {
    saveMobLocationStore(store);
    api.output.print(`[tro] Oznaczono jako zywe: ${revived}.`);
  } catch {
    api.output.print('[tro] Nie udalo sie zapisac zmian w mobLocations.');
  }
}

function printMobTable(
  api: PluginApi,
  preview: (entry: MobLocation) => void,
  rowLimit: number | null = TRO_DEFAULT_ROW_LIMIT,
  onMutation?: () => void,
): void {
  const orderedRows = getOrderedRows(api);
  if (orderedRows.length === 0) {
    api.output.print('[tro] Brak wpisow pbt/besti.');
    return;
  }

  const rows = rowLimit === null ? orderedRows : orderedRows.slice(0, rowLimit);

  const borderColor = api.colors.fromHex('#777777');
  const idColor = api.colors.fromHex('#2f855a');
  const rowColor = api.colors.fromHex('#929292');
  const inactiveColor = api.colors.fromHex('#484848');
  const currentColor = api.colors.fromHex('#6f8f78');
  const aliveMarkerColor = api.colors.fromHex('#777777');
  const deadMarkerColor = api.colors.fromHex('#8f4a4a');
  const previewColor = api.colors.fromHex('#607d9b');
  const deleteColor = api.colors.fromHex('#8f4a4a');

  const mutateEntry = (selected: StoredMobLocation, mutation: 'toggle' | 'remove') => {
    mutateStoredEntry(api, selected, mutation);
    onMutation?.();
    printMobTable(api, preview, rowLimit, onMutation);
  };

  printOutputTable({
    api,
    rows,
    borderState: borderColor,
    rowState: ({ stored, distance }) =>
      stored.entry.active !== '1' ? inactiveColor : distance === 0 ? currentColor : rowColor,
    columns: [
      {
        cell: ({ stored }) => ({
          text: String(stored.entry.roomId),
          state: {
            ...idColor,
            underline: false,
            hyperlink: {
              title: `Ustaw cel: ${stored.entry.mobType} (${stored.entry.roomId})`,
              onClick: () => startWalkerRoute(api, stored.entry, false),
            },
          },
        }),
      },
      {
        align: 'right',
        cell: ({ stored, distance }) => ({
          text: distance === null ? '-' : `${distance} lok.`,
          state: {
            underline: false,
            hyperlink: {
              title: `Idz do: ${stored.entry.mobType} (${stored.entry.roomId})`,
              onClick: () => startWalkerRoute(api, stored.entry),
            },
          },
        }),
      },
      { cell: ({ stored }) => ({ text: stored.entry.mobType }) },
      {
        cell: ({ stored }) => {
          const isActive = stored.entry.active === '1';
          return {
            text: isActive ? '  ' : '💀',
            state: {
              ...(isActive ? aliveMarkerColor : deadMarkerColor),
              underline: false,
              hyperlink: {
                title: isActive ? 'Oznacz jako ubitego' : 'Oznacz jako zywego',
                onClick: () => mutateEntry(stored, 'toggle'),
              },
            },
          };
        },
      },
      {
        cell: ({ stored }) => ({
          text: '👁',
          state: {
            ...previewColor,
            underline: false,
            hyperlink: {
              title: `Podglad przez 3 sekundy: ${stored.entry.mobType} (${stored.entry.roomId})`,
              onClick: () => preview(stored.entry),
            },
          },
        }),
      },
      {
        cell: ({ stored }) => ({
          text: '🗑',
          state: {
            ...deleteColor,
            underline: false,
            hyperlink: {
              title: `Usun: ${stored.entry.mobType} (${stored.entry.roomId})`,
              onClick: () => mutateEntry(stored, 'remove'),
            },
          },
        }),
      },
    ],
  });

  const deadCount = orderedRows.filter(({ stored }) => stored.entry.active === '0').length;
  const reviveLabel = '[ oznacz wszystkie jako zywe ]';
  const reviveButton = new api.AnsiAwareBuffer();
  reviveButton.append(
    reviveLabel,
    deadCount === 0
      ? inactiveColor
      : {
          ...idColor,
          underline: false,
          hyperlink: {
            title: `Oznacz jako zywe: ${deadCount}`,
            onClick: () => {
              reviveAllVisibleMobs(api);
              onMutation?.();
              printMobTable(api, preview, rowLimit, onMutation);
            },
          },
        },
  );
  api.output.print(reviveButton);
}

export function setupTro(api: PluginApi): () => void {
  const mapPreview = createMapPreviewController(api, {
    durationMs: 3_000,
    missingRoomMessage: '[tro] Nie mozna uruchomic podgladu: mapa nie zna biezacej lokacji.',
  });
  const preview = (entry: MobLocation) => mapPreview.preview(entry.roomId);

  const toStoredEntry = (row: TroViewRow): StoredMobLocation => ({
    storageKey: row.storageKey,
    entry: {
      active: row.active ? '1' : '0',
      mobType: row.mobType,
      roomId: row.roomId,
      time: row.time,
    },
  });
  const view = createTroView({
    api,
    getRows: () =>
      getOrderedRows(api).map(({ stored, distance }) => ({
        storageKey: stored.storageKey,
        active: stored.entry.active === '1',
        mobType: stored.entry.mobType,
        roomId: stored.entry.roomId,
        time: stored.entry.time,
        distance,
        current: distance === 0,
      })),
    setTarget: (row) => startWalkerRoute(api, toStoredEntry(row).entry, false),
    startWalking: (row) => startWalkerRoute(api, toStoredEntry(row).entry),
    toggle: (row) => {
      mutateStoredEntry(api, toStoredEntry(row), 'toggle');
      view.refresh();
    },
    preview: (row) => preview(toStoredEntry(row).entry),
    remove: (row) => {
      mutateStoredEntry(api, toStoredEntry(row), 'remove');
      view.refresh();
    },
    reviveAll: () => {
      reviveAllVisibleMobs(api);
      view.refresh();
    },
  });
  const menuEntry = api.ui.addPopupMenuEntry('Trolle', () => void view.open());
  const refreshViewOnArrival = () => view.refresh();
  // Custom core-plugin event; not present in the published plugin-types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api.events as any).on(WALKER_ROUTE_ARRIVED_EVENT, refreshViewOnArrival);

  let pendingTarget: StoredMobLocation | null = null;
  let attackTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingArrivalCleanup: (() => void) | null = null;
  let observedAttack = false;

  const cancelAttackWatch = () => {
    if (attackTimer !== null) clearTimeout(attackTimer);
    attackTimer = null;
  };

  const markCurrentTrollDead = () => {
    const roomId = api.map.getRoom()?.id;
    if (roomId === undefined) return;
    const current = loadMobLocationStore().locations.find(
      ({ entry }) => entry.roomId === roomId && normalizedMobType(entry) === 'pbt' && entry.active === '1',
    );
    if (!current) return;
    mutateStoredEntry(api, current, 'kill');
    view.refresh();
  };

  registerTokenGate(api, 'umarl', /^Wielki cuchnacy troll umarl\.$/i, (line) => {
    if (api.map.getRoom()?.id === pendingTarget?.entry.roomId) {
      pendingArrivalCleanup?.();
      pendingArrivalCleanup = null;
      cancelAttackWatch();
      pendingTarget = null;
      observedAttack = false;
    }
    markCurrentTrollDead();
    return line;
  }, TAG_TRO);

  registerTokenGate(api, 'atakuje', /^(?:atak\s+)?Wielki cuchnacy troll atakuje cie!$/i, (line) => {
    if (pendingTarget && api.map.getRoom()?.id === pendingTarget.entry.roomId) observedAttack = true;
    if (attackTimer !== null) {
      cancelAttackWatch();
      pendingTarget = null;
    }
    return line;
  }, TAG_TRO);

  const armAttackWatch = (target: StoredMobLocation) => {
    cancelAttackWatch();
    pendingTarget = target;
    observedAttack = false;
    const onArrived = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const { roomId } = payload as { roomId?: unknown };
      if (roomId !== target.entry.roomId) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (api.events as any).off(WALKER_ROUTE_ARRIVED_EVENT, onArrived);
      pendingArrivalCleanup = null;
      if (pendingTarget !== target) return;
      if (observedAttack) {
        pendingTarget = null;
        return;
      }
      attackTimer = setTimeout(() => {
        attackTimer = null;
        if (pendingTarget !== target || api.map.getRoom()?.id !== target.entry.roomId) return;
        pendingTarget = null;
        mutateStoredEntry(api, target, 'kill');
        view.refresh();
      }, 2500);
    };
    // Custom core-plugin event; not present in the published plugin-types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.events as any).on(WALKER_ROUTE_ARRIVED_EVENT, onArrived);
    pendingArrivalCleanup = () => (api.events as any).off(WALKER_ROUTE_ARRIVED_EVENT, onArrived);
  };

  api.aliases.register(/^(?:tro_all|tro_lista|tro)$/i, (matches) => {
    const showAll = matches?.[0]?.toLocaleLowerCase('pl-PL') === 'tro_all';
    printMobTable(api, preview, showAll ? null : TRO_DEFAULT_ROW_LIMIT, () => view.refresh());
    return true;
  });

  api.aliases.register(/^trow$/i, () => {
    void view.open();
    return true;
  });

  api.aliases.register(/^tro!$/i, () => {
    const nearestTroll = getOrderedRows(api).find(
      ({ stored, distance }) =>
        normalizedMobType(stored.entry) === 'pbt' && stored.entry.active === '1' && distance !== null,
    );
    if (!nearestTroll) {
      api.output.print('[tro] Brak osiagalnego zywego trolla.');
      return true;
    }
    pendingArrivalCleanup?.();
    armAttackWatch(nearestTroll.stored);
    startWalkerRoute(api, nearestTroll.stored.entry);
    return true;
  });

  return () => {
    mapPreview.dispose();
    pendingArrivalCleanup?.();
    cancelAttackWatch();
    api.triggers.removeByTag(TAG_TRO);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.events as any).off(WALKER_ROUTE_ARRIVED_EVENT, refreshViewOnArrival);
    menuEntry.remove();
    view.stop();
  };
}
