import type { PluginApi } from '@arkadia/plugin-types';

// Colors used throughout the echo line
const COLOR_PREFIX = '#777777';   // "[dev]" marker — muted gray
const COLOR_SYNTAX = '#ffd700';   // alias name — gold
const COLOR_ARROW  = '#777777';   // "→" separator
const COLOR_DESC   = '#cccccc';   // description — light gray

type EchoFn = (matches?: RegExpMatchArray) => string;

function printEcho(api: PluginApi, syntax: string, desc: string): void {
  const buf = new api.AnsiAwareBuffer();
  buf.append('[dev] ', api.colors.fromHex(COLOR_PREFIX));
  buf.append(syntax,  api.colors.fromHex(COLOR_SYNTAX));
  buf.append(' → ',   api.colors.fromHex(COLOR_ARROW));
  buf.append(desc,    api.colors.fromHex(COLOR_DESC));
  api.output.print(buf);
}

/**
 * Register a single alias that echoes "[dev] <syntax> → <desc>" before running.
 * echo can be a static string or a function of regex matches (for dynamic args).
 */
export function registerDev(
  api: PluginApi,
  pattern: RegExp,
  syntax: string,
  desc: string | EchoFn,
  callback: (matches?: RegExpMatchArray) => boolean,
): void {
  api.aliases.register(pattern, (matches) => {
    const resolvedDesc = typeof desc === 'function' ? desc(matches) : desc;
    printEcho(api, syntax, resolvedDesc);
    return callback(matches);
  });
}
