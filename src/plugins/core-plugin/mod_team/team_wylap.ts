import type { PluginApi } from '@arkadia/plugin-types';
import { escapeRegex } from '../../../lib/escapeRegex';
import { withDelay } from '../../../lib/withDelay';
import { learnName } from './team_state';
import type { DruzynaName } from './team_names';

/**
 * `wylap` — capture declensions for team members missing from the name DB.
 *
 * Fired manually (functional bind or the `wylap` alias), never automatically.
 * For each missing name it sends the game's own `odmien <name>` and parses the
 * reply:
 *
 *   Jasko odmienia sie nastepujaco:
 *
 *     Mianownik: Jasko,
 *    Dopelniacz: Jaska,
 *      Celownik: Jaskowi,
 *       Biernik: Jaska,
 *     Narzednik: Jaskiem,
 *   Miejscownik: Jasku.
 *
 * The forms are stored via `learnName` (localStorage) so the name resolves on
 * every later team rebuild, this session and the next.
 *
 * All parsers are armed on demand under TAG_WYLAP and removed the moment the
 * block ends (or the watchdog fires) — nothing of this module sits on the
 * per-line trigger walk while idle.
 */

export const TAG_WYLAP = 'mod_team:wylap';

// Colors — same palette as the rest of the mod_team diagnostics.
const COLOR_PREFIX = '#777777';
const COLOR_WARN = '#ff8800';
const COLOR_OK = '#66dd66';
const COLOR_NAME = '#ffd700';
const COLOR_FORM = '#cccccc';

const WATCHDOG_MS = 5000; // no reply to `odmien` within this → give up on the name
const GAP_MIN = 300; // pause between consecutive `odmien` commands
const GAP_MAX = 600;

/** Case labels the game prints, mapped onto DruzynaName fields. */
const CASE_FIELDS: Record<string, keyof DruzynaName> = {
  mianownik: 'M',
  dopelniacz: 'D',
  celownik: 'C',
  biernik: 'B',
  narzednik: 'N',
};

interface Capture {
  /** Names still to be declined, current one excluded. */
  queue: string[];
  /** The name being declined right now. */
  name: string;
  /** Forms collected so far for `name`. */
  forms: Partial<Record<keyof DruzynaName, string>>;
  /** Names successfully learned during this run. */
  learned: string[];
  /** Names the game would not decline during this run. */
  failed: string[];
}

let capture: Capture | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;

function print(api: PluginApi, text: string, color: string): void {
  const buf = new api.AnsiAwareBuffer();
  buf.append('[druzyna] ', api.colors.fromHex(COLOR_PREFIX));
  buf.append(text, api.colors.fromHex(color));
  api.output.print(buf);
}

function clearWatchdog(): void {
  if (watchdog !== null) {
    clearTimeout(watchdog);
    watchdog = null;
  }
}

/** Drop every armed parser and forget the run. */
function disarm(api: PluginApi): void {
  clearWatchdog();
  api.triggers.removeByTag(TAG_WYLAP);
}

/** True while a capture run is in progress. */
export function isWylapRunning(): boolean {
  return capture !== null;
}

/**
 * Abort any capture in progress (plugin teardown, or a new run superseding an
 * old one). Safe to call when nothing is running.
 */
export function cancelWylap(api: PluginApi): void {
  disarm(api);
  capture = null;
}

/**
 * Start capturing declensions for `names`. `onFinished` runs once the whole
 * queue is done (the caller rebuilds the team so the new forms take effect).
 */
export function startWylap(
  api: PluginApi,
  names: string[],
  onFinished?: () => void,
): void {
  if (capture) {
    print(api, 'wylap: odmiana juz trwa.', COLOR_WARN);
    return;
  }
  if (names.length === 0) {
    print(api, 'wylap: brak nazw do odmiany.', COLOR_WARN);
    return;
  }

  const queue = [...names];
  capture = { queue, name: '', forms: {}, learned: [], failed: [] };
  print(api, `wylap: odmieniam ${names.join(', ')}`, COLOR_NAME);
  askNext(api, onFinished);
}

/** Take the next name off the queue, arm the parsers, send `odmien <name>`. */
function askNext(api: PluginApi, onFinished?: () => void): void {
  const run = capture;
  if (!run) return;

  const name = run.queue.shift();
  if (name === undefined) {
    finishRun(api, run, onFinished);
    return;
  }

  run.name = name;
  run.forms = {};
  arm(api, run, onFinished);
  api.command.send(`odmien ${name}`, false);
}

/** Arm the block parsers for the name currently being declined. */
function arm(api: PluginApi, run: Capture, onFinished?: () => void): void {
  // Any timer/trigger that outlives its run (cancel, teardown, a superseded
  // run) must do nothing — identity of the capture object is the guard.
  const isStale = () => capture !== run;

  /** Give up on the current name and move on. */
  const fail = (reason: string) => {
    api.triggers.removeByTag(TAG_WYLAP);
    clearWatchdog();
    run.failed.push(run.name);
    print(api, `wylap: ${run.name} — ${reason}.`, COLOR_WARN);
    askNext(api, onFinished);
  };

  clearWatchdog();
  watchdog = setTimeout(() => {
    if (isStale()) return;
    fail('brak odpowiedzi');
  }, WATCHDOG_MS);

  // The game's usage error — it did not recognise the name at all. Fails the
  // name immediately instead of sitting out the whole watchdog.
  api.triggers.registerOneTime(
    /^\s*Odmien <kto\/co>\?\s*$/i,
    (line) => {
      if (isStale()) return line;
      // Never work inline in a trigger callback: a throw here would abort the
      // client's processing of the rest of the output batch.
      withDelay(GAP_MIN, GAP_MAX, () => {
        if (isStale()) return;
        fail('gra nie rozpoznaje tej nazwy');
      });
      return line;
    },
    TAG_WYLAP,
  );

  // Header — "<Name> odmienia sie nastepujaco:". Only extends the watchdog;
  // the case lines below carry the actual data.
  api.triggers.registerOneTime(
    new RegExp(`^${escapeRegex(run.name)} odmienia sie nastepujaco:$`, 'i'),
    (line) => {
      if (isStale()) return line;
      clearWatchdog();
      watchdog = setTimeout(() => {
        if (isStale()) return;
        api.triggers.removeByTag(TAG_WYLAP);
        complete(api, run, onFinished); // partial block — keep whatever arrived
      }, WATCHDOG_MS);
      return line;
    },
    TAG_WYLAP,
  );

  // "  Mianownik: Jasko," … "Miejscownik: Jasku." — one parser for all six
  // lines; Miejscownik (the last, unused case) closes the block.
  api.triggers.register(
    /^\s*(Mianownik|Dopelniacz|Celownik|Biernik|Narzednik|Miejscownik):\s*(.+?)[,.]?\s*$/i,
    (line, matches) => {
      if (isStale()) return line;
      const label = matches[1].toLowerCase();
      const form = matches[2].trim();
      const field = CASE_FIELDS[label];
      if (field) run.forms[field] = form;
      if (label === 'miejscownik') {
        api.triggers.removeByTag(TAG_WYLAP);
        clearWatchdog();
        // Complete on a timer, never inline: a throw inside a trigger callback
        // would abort the rest of the client's output batch.
        withDelay(GAP_MIN, GAP_MAX, () => {
          if (isStale()) return;
          complete(api, run, onFinished);
        });
      }
      return line;
    },
    TAG_WYLAP,
  );
}

/** Store the collected forms for the current name and move on. */
function complete(api: PluginApi, run: Capture, onFinished?: () => void): void {
  const M = run.forms.M ?? run.name;
  const entry: DruzynaName = {
    M,
    B: run.forms.B ?? M,
    C: run.forms.C ?? M,
    D: run.forms.D ?? M,
    N: run.forms.N ?? M,
  };
  const complete4 = run.forms.B && run.forms.C && run.forms.D && run.forms.N;

  learnName(entry);
  run.learned.push(entry.M);

  const buf = new api.AnsiAwareBuffer();
  buf.append('[druzyna] ', api.colors.fromHex(COLOR_PREFIX));
  buf.append('Odmieniono: ', api.colors.fromHex(complete4 ? COLOR_OK : COLOR_WARN));
  buf.append(entry.M.padEnd(14), api.colors.fromHex(COLOR_NAME));
  buf.append(
    ` B:${entry.B} C:${entry.C} D:${entry.D} N:${entry.N}`,
    api.colors.fromHex(COLOR_FORM),
  );
  api.output.print(buf);
  if (!complete4) {
    print(api, `wylap: niepelna odmiana ${entry.M} — brakujace formy = mianownik.`, COLOR_WARN);
  }

  askNext(api, onFinished);
}

/** The queue is empty — report and hand back to the caller for a team rebuild. */
function finishRun(api: PluginApi, run: Capture, onFinished?: () => void): void {
  disarm(api);
  capture = null;

  const parts: string[] = [];
  if (run.learned.length > 0) parts.push(`zapisano ${run.learned.length}`);
  if (run.failed.length > 0) parts.push(`nieudane: ${run.failed.join(', ')}`);
  print(api, `wylap: ${parts.join('; ') || 'nic do zrobienia'}.`, run.failed.length > 0 ? COLOR_WARN : COLOR_OK);

  onFinished?.();
}

/**
 * Print every learned declension as a paste-ready `team_names.ts` line, so the
 * user can promote them into the generated master DB.
 */
export function printLearned(api: PluginApi, learned: DruzynaName[]): void {
  if (learned.length === 0) {
    print(api, 'wylap: brak zapamietanych odmian.', COLOR_WARN);
    return;
  }
  print(api, `Zapamietane odmiany (${learned.length}):`, COLOR_NAME);
  for (const e of learned) {
    const buf = new api.AnsiAwareBuffer();
    buf.append(
      `  { M: '${e.M}', B: '${e.B}', C: '${e.C}', D: '${e.D}', N: '${e.N}' },`,
      api.colors.fromHex(COLOR_FORM),
    );
    api.output.print(buf);
  }
}
