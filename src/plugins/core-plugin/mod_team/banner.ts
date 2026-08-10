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

/**
 * Letterspace a banner label: 'PRZELAMALI CIE' -> 'P R Z E L A M A L I   C I E'.
 * One space between letters, three between words — the spacing team_zaslony.ts
 * types by hand in ' z a s l a n i a '.
 */
export function spread(text: string): string {
  return text
    .split(' ')
    .map((word) => word.split('').join(' '))
    .join('   ');
}
