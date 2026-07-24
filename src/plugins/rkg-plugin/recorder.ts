import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../lib/colors/my-ansi-colors';

/**
 * Transcript recorder.
 *
 * The CMud module answered the club-creation dialogue purely on timers — it
 * never matched on the game's questions, so the source contains no record of
 * what they actually say. `kreator.ts` wants those prompts as regexes. This
 * captures them: turn it on, walk the dialogue by hand once, print the buffer.
 *
 *   rkg?    start recording
 *   rkg??   print what was captured
 *   rkg?-   stop
 *
 * The trigger is a bare `api.triggers.register` with no pattern, which is the
 * one thing RULE #1 exists to prevent — so it is registered only while
 * recording and removed the moment it stops. Nothing is armed at init, which is
 * what `test/trigger-budget.test.ts` checks.
 */

export const TAG_REJESTRATOR = 'rkgRecord';

const LIMIT_LINII = 300;

export function setupRejestrator(api: PluginApi): () => void {
  const kolorInfo = getAnsiFormatState(3, api);
  const kolorLinii = getAnsiFormatState(7, api);
  let bufor: string[] = [];
  let nagrywa = false;

  const info = (tekst: string) => {
    const buf = new api.AnsiAwareBuffer(tekst);
    buf.color([0, tekst.length], kolorInfo);
    api.output.print(buf);
  };

  const stop = () => {
    if (!nagrywa) return;
    nagrywa = false;
    api.triggers.removeByTag(TAG_REJESTRATOR);
  };

  api.aliases.register(/^rkg\?$/i, () => {
    if (nagrywa) {
      info('[rkg] juz nagrywam — rkg?? pokaze, rkg?- zatrzyma');
      return true;
    }
    bufor = [];
    nagrywa = true;
    // Matches every line; see the note above on why this is safe here.
    api.triggers.register(
      /.*/,
      (line) => {
        // A trigger callback must never throw — the client has no per-trigger
        // try/catch and one exception drops the rest of the output batch.
        try {
          if (bufor.length < LIMIT_LINII) bufor.push(line.text);
        } catch {
          /* ignore */
        }
        return line;
      },
      TAG_REJESTRATOR,
    );
    info(`[rkg] nagrywam (max ${LIMIT_LINII} linii). Przejdz dialog recznie, potem: rkg??`);
    return true;
  });

  api.aliases.register(/^rkg\?\?$/i, () => {
    if (bufor.length === 0) {
      info('[rkg] bufor pusty — najpierw rkg?');
      return true;
    }
    info(`[rkg] --- ${bufor.length} linii ---`);
    for (const linia of bufor) {
      const tekst = `| ${linia}`;
      const buf = new api.AnsiAwareBuffer(tekst);
      buf.color([0, tekst.length], kolorLinii);
      api.output.print(buf);
    }
    info('[rkg] --- koniec ---');
    return true;
  });

  api.aliases.register(/^rkg\?-$/i, () => {
    stop();
    info(`[rkg] stop (${bufor.length} linii w buforze)`);
    return true;
  });

  return stop;
}
