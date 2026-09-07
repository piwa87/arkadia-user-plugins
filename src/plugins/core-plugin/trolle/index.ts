import type { FormatStateSnapshot, PluginApi } from '@arkadia/plugin-types';
import { DYNAMIC_WALKER_ARRIVED_EVENT, DYNAMIC_WALKER_START_EVENT } from '../walker';
import { createTroView, type TroViewRow } from './view';

export const TRO_STORAGE_KEY = 'mobLocations';
const TRO_DEFAULT_ROW_LIMIT = 30;
const VISIBLE_MOB_TYPES = new Set(['pbt', 'besti']);

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
        locations: parsed.flatMap((entry) => (
          isMobLocation(entry) ? [{ storageKey: null, entry }] : []
        )),
      };
    }
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      return {
        kind: 'record',
        raw: record,
        locations: Object.entries(record).flatMap(([storageKey, entry]) => (
          isMobLocation(entry) ? [{ storageKey, entry }] : []
        )),
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

function distanceFromCurrent(api: PluginApi, roomId: number): number | null {
  const currentId = api.map.getRoom()?.id;
  if (currentId === undefined) return null;
  if (currentId === roomId) return 0;
  const path = api.map.findPath(currentId, roomId);
  return path ? Math.max(0, path.length - 1) : null;
}

function isSameMobLocation(entry: MobLocation, selected: MobLocation): boolean {
  return (
    entry.roomId === selected.roomId &&
    entry.mobType === selected.mobType &&
    entry.time === selected.time
  );
}

function normalizedMobType(entry: MobLocation): string {
  return entry.mobType.trim().toLocaleLowerCase('pl-PL');
}

function getOrderedRows(api: PluginApi): MobRow[] {
  return loadMobLocationStore().locations
    .filter(({ entry }) => VISIBLE_MOB_TYPES.has(normalizedMobType(entry)))
    .map((stored, sourceIndex) => ({
      stored,
      sourceIndex,
      distance: distanceFromCurrent(api, stored.entry.roomId),
    }))
    .sort((left, right) => (
      (left.distance ?? Number.POSITIVE_INFINITY) - (right.distance ?? Number.POSITIVE_INFINITY) ||
      left.sourceIndex - right.sourceIndex
    ));
}

function startDynamicWalker(api: PluginApi, entry: MobLocation, automatic: boolean): void {
  // Custom event shared inside core-plugin; absent from the published event union.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api.events as any).emit(DYNAMIC_WALKER_START_EVENT, {
    roomId: entry.roomId,
    label: entry.mobType,
    automatic,
  });
}

function mutateStoredEntry(
  api: PluginApi,
  selected: StoredMobLocation,
  mutation: 'toggle' | 'remove',
): void {
  const freshStore = loadMobLocationStore();
  let current: MobLocation | null = null;
  let arrayIndex = -1;

  if (freshStore.kind === 'record' && selected.storageKey !== null) {
    const candidate = freshStore.raw[selected.storageKey];
    if (isMobLocation(candidate) && isSameMobLocation(candidate, selected.entry)) current = candidate;
  } else if (freshStore.kind === 'array') {
    arrayIndex = freshStore.raw.findIndex((candidate) => (
      isMobLocation(candidate) && isSameMobLocation(candidate, selected.entry)
    ));
    if (arrayIndex !== -1) current = freshStore.raw[arrayIndex] as MobLocation;
  }

  if (current === null) {
    api.output.print('[tro] Wpis zostal juz zmieniony albo usuniety.');
    return;
  }

  try {
    if (mutation === 'toggle') {
      const updated = { ...current, active: current.active === '1' ? '0' : '1' };
      if (freshStore.kind === 'record') freshStore.raw[selected.storageKey!] = updated;
      else freshStore.raw[arrayIndex] = updated;
    } else {
      if (freshStore.kind === 'record') delete freshStore.raw[selected.storageKey!];
      else freshStore.raw.splice(arrayIndex, 1);
    }
    saveMobLocationStore(freshStore);
    if (mutation === 'remove') {
      api.output.print(`[tro] Usunieto ${selected.entry.mobType} z lokacji ${selected.entry.roomId}.`);
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

  const distanceLabels = rows.map(({ distance }) => distance === null ? '-' : `${distance} lok.`);
  const idWidth = Math.max(...rows.map(({ stored }) => String(stored.entry.roomId).length));
  const distanceWidth = Math.max(...distanceLabels.map((value) => value.length));
  const typeWidth = Math.max(...rows.map(({ stored }) => stored.entry.mobType.length));
  const checkWidth = 2;
  const actionWidth = 2;
  const border = `+${'-'.repeat(idWidth + 2)}+${'-'.repeat(distanceWidth + 2)}+${'-'.repeat(typeWidth + 2)}+${'-'.repeat(checkWidth + 2)}+${'-'.repeat(actionWidth + 2)}+${'-'.repeat(actionWidth + 2)}+`;

  const borderColor = api.colors.fromHex('#777777');
  const idColor = api.colors.fromHex('#2f855a');
  const rowColor = api.colors.fromHex('#929292');
  const inactiveColor = api.colors.fromHex('#484848');
  const currentColor = api.colors.fromHex('#6f8f78');
  const aliveMarkerColor = api.colors.fromHex('#777777');
  const deadMarkerColor = api.colors.fromHex('#8f4a4a');
  const previewColor = api.colors.fromHex('#607d9b');
  const deleteColor = api.colors.fromHex('#8f4a4a');

  const printColored = (text: string, color: FormatStateSnapshot) => {
    const buffer = new api.AnsiAwareBuffer(text);
    buffer.color([0, text.length], color);
    api.output.print(buffer);
  };

  const mutateEntry = (
    selected: StoredMobLocation,
    mutation: 'toggle' | 'remove',
  ) => {
    mutateStoredEntry(api, selected, mutation);
    onMutation?.();
    printMobTable(api, preview, rowLimit, onMutation);
  };

  printColored(border, borderColor);
  rows.forEach(({ stored, distance }, index) => {
    const { entry } = stored;
    const buffer = new api.AnsiAwareBuffer();
    const roomId = String(entry.roomId);
    const distanceLabel = distanceLabels[index];
    const isActive = entry.active === '1';
    const dataColor = !isActive ? inactiveColor : distance === 0 ? currentColor : rowColor;

    buffer.append('| ', dataColor);
    buffer.append(roomId, {
      ...idColor,
      underline: false,
      hyperlink: {
        title: `Ustaw cel: ${entry.mobType} (${entry.roomId})`,
        onClick: () => startDynamicWalker(api, entry, false),
      },
    });
    buffer.append(`${' '.repeat(idWidth - roomId.length)} | `, dataColor);
    buffer.append(distanceLabel.padStart(distanceWidth), {
      ...dataColor,
      underline: false,
      hyperlink: {
        title: `Idz do: ${entry.mobType} (${entry.roomId})`,
        onClick: () => startDynamicWalker(api, entry, true),
      },
    });
    buffer.append(
      ` | ${entry.mobType.padEnd(typeWidth)} | `,
      dataColor,
    );
    const checkIcon = isActive ? '  ' : '💀';
    buffer.append(checkIcon, {
      ...(isActive ? aliveMarkerColor : deadMarkerColor),
      underline: false,
      hyperlink: {
        title: isActive ? 'Oznacz jako ubitego' : 'Oznacz jako zywego',
        onClick: () => mutateEntry(stored, 'toggle'),
      },
    });
    buffer.append(`${' '.repeat(checkWidth - checkIcon.length)} | `, dataColor);
    buffer.append('👁', {
      ...previewColor,
      underline: false,
      hyperlink: {
        title: `Podglad przez 3 sekundy: ${entry.mobType} (${entry.roomId})`,
        onClick: () => preview(entry),
      },
    });
    buffer.append(`${' '.repeat(actionWidth - '👁'.length)} | `, dataColor);
    buffer.append('🗑', {
      ...deleteColor,
      underline: false,
      hyperlink: {
        title: `Usun: ${entry.mobType} (${entry.roomId})`,
        onClick: () => mutateEntry(stored, 'remove'),
      },
    });
    buffer.append(`${' '.repeat(actionWidth - '🗑'.length)} |`, dataColor);
    api.output.print(buffer);
  });
  printColored(border, borderColor);

  const deadCount = orderedRows.filter(({ stored }) => stored.entry.active === '0').length;
  const reviveLabel = '[ oznacz wszystkie jako zywe ]';
  const reviveButton = new api.AnsiAwareBuffer();
  reviveButton.append(reviveLabel, deadCount === 0 ? inactiveColor : {
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
  });
  api.output.print(reviveButton);
}

export function setupTro(api: PluginApi): () => void {
  let previewTimer: ReturnType<typeof setTimeout> | null = null;
  let previewOriginId: number | null = null;

  const finishPreview = () => {
    const originId = previewOriginId;
    previewTimer = null;
    previewOriginId = null;
    if (originId !== null) void api.command.send(`/ustaw ${originId}`);
  };

  const preview = (entry: MobLocation) => {
    if (previewTimer === null) {
      const currentId = api.map.getRoom()?.id;
      if (currentId === undefined) {
        api.output.print('[tro] Nie mozna uruchomic podgladu: mapa nie zna biezacej lokacji.');
        return;
      }
      previewOriginId = currentId;
    } else {
      clearTimeout(previewTimer);
    }
    void api.command.send(`/ustaw ${entry.roomId}`);
    previewTimer = setTimeout(finishPreview, 3000);
  };

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
    getRows: () => getOrderedRows(api).map(({ stored, distance }) => ({
      storageKey: stored.storageKey,
      active: stored.entry.active === '1',
      mobType: stored.entry.mobType,
      roomId: stored.entry.roomId,
      time: stored.entry.time,
      distance,
      current: distance === 0,
    })),
    setTarget: (row) => startDynamicWalker(api, toStoredEntry(row).entry, false),
    startWalking: (row) => startDynamicWalker(api, toStoredEntry(row).entry, true),
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
  (api.events as any).on(DYNAMIC_WALKER_ARRIVED_EVENT, refreshViewOnArrival);

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
    const nearestTroll = getOrderedRows(api).find(({ stored, distance }) => (
      normalizedMobType(stored.entry) === 'pbt' &&
      stored.entry.active === '1' &&
      distance !== null
    ));
    if (!nearestTroll) {
      api.output.print('[tro] Brak osiagalnego zywego trolla.');
      return true;
    }
    startDynamicWalker(api, nearestTroll.stored.entry, true);
    return true;
  });

  return () => {
    if (previewTimer !== null) clearTimeout(previewTimer);
    finishPreview();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.events as any).off(DYNAMIC_WALKER_ARRIVED_EVENT, refreshViewOnArrival);
    menuEntry.remove();
    view.stop();
  };
}
