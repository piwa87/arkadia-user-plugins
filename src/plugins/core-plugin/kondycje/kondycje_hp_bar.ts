import type { PluginApi, ObjectListEntryFilter } from '@arkadia/plugin-types';
import { getAnsiColor, type AnsiColorNumber } from '../../../lib/colors/my-ansi-colors';
import { col9 } from '../../../lib/colors/my-colors';

const FILTER_NAME = 'kondycje:hpBar';

/**
 * HP-bar colors per level (1 = barely alive ... 7 = excellent), keyed by the
 * same ANSI palette indices used by the kondycje line colors so both views
 * stay visually consistent:
 *
 *   1 ledwo zyw          ansi47 -> fg15 white  + bg2 dark gray
 *   2 ciezko rann        ansi86 -> fg6  red    + bg5 dark purple
 *   3 w zlej kondycji    ansi6  -> fg6  red    + bg0
 *   4 ranny              ansi5  -> fg5  amber  + bg0
 *   5 lekko ranny        ansi4  -> fg4  green  + bg0
 *   6 w dobrym stanie    ansi3  -> fg3  whiter + bg0
 *   7 w swietnej kondycji ansi3 -> fg3  whiter + bg0
 */
const HP_ANSI: ReadonlyArray<AnsiColorNumber> = [47, 86, 6, 5, 4, 3, 3];

/** Resolved CSS colors per HP level (index 0 = level 1). */
const HP_COLORS = HP_ANSI.map((index) => {
  const { foreground, background, bgIndex } = getAnsiColor(index);
  // bg0 is the near-black default; skip it so the bar inherits the panel
  // background (and so we never emit the typo'd bg0 hex value).
  return { foreground, background: bgIndex === 0 ? null : background };
});

function buildBar(level: number): string {
  const color = HP_COLORS[level - 1] ?? HP_COLORS[HP_COLORS.length - 1];
  const filled = '##'.repeat(level);
  const empty = '..'.repeat(7 - level);
  const style = color.background
    ? `color:${color.foreground};background-color:${color.background}`
    : `color:${color.foreground}`;
  return `[<span style="${style}">${filled}${empty}</span>]`;
}

const customHpBar: ObjectListEntryFilter = (context, result) => {
  const raw = context.object.hp; // value from GMCP: 0..6
  if (typeof raw !== 'number') return;

  const level = Math.max(0, Math.min(6, raw)) + 1; // 1..7
  const bar = buildBar(level);

  // Color the teammate's name in col9 (my blue); HP bar keeps per-level colors.
  if (context.isTeammate) {
    result.style.descriptionColor = col9;
  }

  // Keep the bar clickable: /prze for enemies, /w (wycofaj) for teammates.
  result.content.hpBar = context.isTeammate
    ? `<span class="object-hp-bar-teammate" data-object-num="${context.displayNum}" data-object-id="${context.object.num}" title="Wycofaj sie">${bar}</span>`
    : `<span class="object-hp-bar" data-object-num="${context.displayNum}" data-object-id="${context.object.num}" title="Przelam">${bar}</span>`;
};

/** Registers the HP-bar filter and returns a cleanup function. */
export function setupHpBar(api: PluginApi): () => void {
  // Lower priority runs later (docs: higher = runs first); run last so we
  // win the content.hpBar slot over any other filter.
  api.objectListFilters.register(FILTER_NAME, customHpBar, -100);
  return () => api.objectListFilters.unregister(FILTER_NAME);
}
