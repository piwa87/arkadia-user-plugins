import type { AnsiAwareBuffer, PluginApi } from '@arkadia/plugin-types';

// Same shape as the published TriggerCallback plus the 4th argument the client
// actually passes at runtime (the line text before any trigger modified it) —
// the published plugin-types lag the client here.
type GateCallback = (
  line: AnsiAwareBuffer,
  matches: RegExpMatchArray,
  type: string,
  originalLine?: string,
) => AnsiAwareBuffer | null;

/**
 * Register a trigger behind the client's token index instead of the per-line
 * regex walk.
 *
 * The client tests every registered regex/string trigger against every line of
 * game output; token triggers are bucketed by word and cost ~nothing on lines
 * that don't contain the word. This helper registers one token trigger per
 * gate word and runs `pattern` (the original regex/string) only on lines that
 * contain one of the words — behavior-identical to a plain
 * `api.triggers.register(pattern, callback, tag)` provided every line matched
 * by `pattern` contains at least one gate word.
 *
 * When several gate words appear in one line the callback still fires only
 * once (per-line identity guard).
 */
export function registerTokenGate(
  api: PluginApi,
  tokens: string | string[],
  pattern: RegExp | string | (RegExp | string)[],
  callback: GateCallback,
  tag: string,
): void {
  const tokenList = Array.isArray(tokens) ? tokens : [tokens];
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  let lastLine: unknown = null;

  const gateCallback: GateCallback = (line, _matches, type, originalLine) => {
    if (line === lastLine) return line;
    lastLine = line;

    const plain = (originalLine ?? line.text).replace(/\s$/g, '');
    for (const p of patterns) {
      let matches: RegExpMatchArray | null = null;
      if (p instanceof RegExp) {
        matches = plain.match(p);
      } else {
        const index = plain.indexOf(p);
        if (index > -1) {
          matches = [plain.substring(index, index + p.length)] as RegExpMatchArray;
          matches.index = index;
          matches.input = plain;
        }
      }
      if (matches) return callback(line, matches, type, originalLine);
    }
    return line;
  };

  for (const token of tokenList) {
    api.triggers.registerToken(token, gateCallback, tag, { caseInsensitive: true });
  }
}

export type { AnsiAwareBuffer };
