import type { FormatStateSnapshot, PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { registerTokenGate } from '../../../lib/registerTokenGate';

/** CMUD `col_manewr`: named cooldown alarms for maneuvers and orders. */

let apiRef: PluginApi | null = null;
let c3Ref: FormatStateSnapshot | null = null;
let c13Ref: FormatStateSnapshot | null = null;
let maneuverTimer: ReturnType<typeof setTimeout> | null = null;
let maneuverDeadline = 0;
let orderTimer: ReturnType<typeof setTimeout> | null = null;
let orderDeadline = 0;
let aliasIds: string[] = [];

function print(api: PluginApi, text: string, color: FormatStateSnapshot): void {
  const buf = new api.AnsiAwareBuffer();
  buf.append(text, color);
  api.output.print(buf);
}

function clearManeuverTimer(): void {
  if (maneuverTimer) clearTimeout(maneuverTimer);
  maneuverTimer = null;
  maneuverDeadline = 0;
}

function clearOrderTimer(): void {
  if (orderTimer) clearTimeout(orderTimer);
  orderTimer = null;
  orderDeadline = 0;
}

function remainingMs(deadline: number): number {
  return deadline ? Math.max(0, deadline - Date.now()) : 0;
}

/** CMUD alias `kol_manewr`: replace the named alarm with a fresh +5 second alarm. */
export function runKolManewrAlias(): boolean {
  const api = apiRef;
  const c3 = c3Ref;
  if (!api || !c3) return true;

  clearManeuverTimer();
  maneuverDeadline = Date.now() + 5000;
  maneuverTimer = setTimeout(() => {
    maneuverTimer = null;
    maneuverDeadline = 0;
    print(api, `${'   '.repeat(10)}m a n e w r u j${'  '.repeat(10)}m a n e w r u j`, c3);
  }, 5000);
  return true;
}

/** CMUD alias `kol_rozkaz`: replace the named alarm with a fresh +15 second alarm. */
function armOrderTimer(): void {
  const api = apiRef;
  const c13 = c13Ref;
  if (!api || !c13) return;

  clearOrderTimer();
  orderDeadline = Date.now() + 15_000;
  orderTimer = setTimeout(() => {
    orderTimer = null;
    orderDeadline = 0;
    const ready =
      '                r o z k a z u j                     r o z k a z u j ';
    print(api, '', c13);
    print(api, ready, c13);
    print(api, ready, c13);
    print(api, '', c13);
  }, 15_000);
}

export function setupManewr(api: PluginApi, tag: string): void {
  apiRef = api;
  const c3 = getAnsiFormatState(3, api);
  c3Ref = c3;
  c13Ref = getAnsiFormatState(13, api);

  registerTokenGate(
    api,
    'manewru',
    /^Nie jestes jeszcze goto\w+ do wykonania kolejnego manewru\./,
    (line) => {
      print(api, `--> ${remainingMs(maneuverDeadline)} msek`, c3);
      return line;
    },
    tag,
  );

  registerTokenGate(
    api,
    'rozkaz',
    /^Nie jestes jeszcze goto\w+, by moc wydac jakis rozkaz\./,
    (line) => {
      print(api, `--> ${remainingMs(orderDeadline) / 1000} sek.`, c3);
      return line;
    },
    tag,
  );

  aliasIds.push(
    api.aliases.register(/^kol_manewr$/i, runKolManewrAlias),
    api.aliases.register(/^kol_rozkaz$/i, () => {
      armOrderTimer();
      return true;
    }),
    api.aliases.register(/^man!$/i, () => {
      print(api, `${'   '.repeat(10)}m a n e w r u j${'  '.repeat(10)}m a n e w r u j`, c3);
      return true;
    }),
  );
}

export function destroyManewr(api: PluginApi): void {
  clearManeuverTimer();
  clearOrderTimer();
  for (const id of aliasIds) api.aliases.remove(id);
  aliasIds = [];
  apiRef = null;
  c3Ref = null;
  c13Ref = null;
}
