import type { AnsiAwareBuffer, FormatStateSnapshot, PluginApi } from '@arkadia/plugin-types';
import { getMyColor } from '../../../lib/colors/my-colors';
import { escapeRegex } from '../../../lib/escapeRegex';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import { getCurrentTeam } from './team_state';

/**
 * kol_druzyna — colors every occurrence of a current team member's name (any
 * case form) with foreground color 9. Registered as token triggers (one per
 * form, indexed by the client) and rebuilt whenever the team changes.
 *
 * Banner rewrites (zaslony/cel/ataki) call colorTeamNames() explicitly from
 * banner.rewrite(): the old always-on regex trigger ran after those rewrites in
 * the trigger walk, while token-trigger order depends on word position in the
 * line — the explicit call keeps team names inside banners colored either way.
 */

const KOL_TAG = 'kol_druzyna';
const TEAM_COLOR = 9; // #CW 9 — foreground color for team names

let scan: RegExp | null = null;
let color: FormatStateSnapshot | null = null;

/** Color every whole-word team-name form in the line's current text. */
export function colorTeamNames(line: AnsiAwareBuffer): void {
  if (!scan || !color) return;
  scan.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = scan.exec(line.text)) !== null) {
    line.color([m.index, m.index + m[0].length], color);
    if (m.index === scan.lastIndex) scan.lastIndex++; // zero-length guard
  }
}

/** Drop and re-register the per-form token triggers for the current team. */
export function rebuildTeamColorTokens(api: PluginApi): void {
  api.triggers.removeByTag(KOL_TAG);
  scan = null;

  // All distinct name forms across the team's declensions.
  const forms = new Set<string>();
  for (const m of getCurrentTeam()) {
    forms.add(m.M);
    forms.add(m.B);
    forms.add(m.C);
    forms.add(m.D);
    forms.add(m.N);
  }
  if (forms.size === 0) return;

  // Longest-first so e.g. "Vindaelowi" wins over "Vindael" at the same position.
  const alt = [...forms]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join('|');
  const source = `\\b(?:${alt})\\b`;
  scan = new RegExp(source, 'g');
  color = getMyColor(TEAM_COLOR, api);

  registerTokenGate(
    api,
    [...forms],
    new RegExp(source),
    (line) => {
      colorTeamNames(line);
      return line;
    },
    KOL_TAG,
  );
}

export function destroyTeamColors(api: PluginApi): void {
  api.triggers.removeByTag(KOL_TAG);
  scan = null;
  color = null;
}
