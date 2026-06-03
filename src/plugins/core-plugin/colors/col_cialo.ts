import type { PluginApi } from '@arkadia/plugin-types';

const TAG = 'colCialo';

export function setupColCialo(api: PluginApi): void {
  const darkGrey = api.colors.fromHex('#3D3D3D');

  // Match "cialo adj noun" or "cialo adj adj noun" — 2 or 3 words after cialo
  const segmentRe = /[Cc]ialo(?:\s+[^\s,]+){2,3}/g;

  api.triggers.register(
    /cialo/i,
    (line) => {
      const text = line.text;
      let match: RegExpExecArray | null;
      segmentRe.lastIndex = 0;
      while ((match = segmentRe.exec(text)) !== null) {
        line.color([match.index, match.index + match[0].length], darkGrey);
      }
      return line;
    },
    TAG,
  );
}
