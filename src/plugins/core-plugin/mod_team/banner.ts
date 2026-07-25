import type { AnsiAwareBuffer, FormatStateSnapshot } from '@arkadia/plugin-types';
import { colorTeamNames } from './team_colors';

export type Segment = [text: string, color: FormatStateSnapshot];

/**
 * Replace the whole line with the given coloured segments, then re-apply
 * team-name coloring so names inside banners stay highlighted (see
 * team_colors.ts for why this is explicit).
 */
export function rewrite(line: AnsiAwareBuffer, segments: Segment[]): void {
  line.clear();
  for (const [text, color] of segments) line.append(text, color);
  colorTeamNames(line);
}
