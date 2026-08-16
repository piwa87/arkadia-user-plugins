import type { PluginApi } from '@arkadia/plugin-types';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import { getMyColor } from '../../../lib/colors/my-colors';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';

const TAG = 'kompas';

/**
 * Compass usage triggers: shortens compass-reading lines, alerts when
 * the compass breaks, and provides a quick-fix alias.
 */
export function setupKompas(api: PluginApi): void {
  // --- Someone else uses a compass: gag the long text, print a short notice ---

  registerTokenGate(
    api,
    'kompas',
    /uklada.*kompas.*na wyprostowanej dloni/i,
    (line, matches) => {
      const name = matches?.[1] ?? 'Ktos';
      const gray = getMyColor(0, api);
      const text = `${name}.....uzywa kompasu`;
      const buf = new api.AnsiAwareBuffer(text);
      buf.color([name.length, text.length], gray);
      api.output.print(buf);
      return null; // suppress original line
    },
    TAG,
  );

  // --- Compass breaks: alert and register a one-shot fix alias (f) ---

  registerTokenGate(
    api,
    'kompasu',
    /^Widzisz jak szkielko .* kompasu peka, a cale urzadzenie po prostu rozpada ci sie w rekach\.$/i,
    () => {
      api.command.send('play_tink');

      const gray = getMyColor(0, api);
      const red = getMyColor(6, api);
      const text1 = '.....';
      const text2 = 'ROZJEBAL SIE KOMPAS!';
      const buf = new api.AnsiAwareBuffer(text1 + text2);
      buf.color([0, text1.length], gray);
      buf.color([text1.length, buf.text.length], red);
      api.output.print(buf);

      // One-shot alias 'f' to open trunk, take out compass, use it
      const fixId = api.aliases.register(/^f$/, () => {
        api.command.send('ot');
        api.command.send('wyj kompas');
        api.command.send('sk');
        api.aliases.remove(fixId);
        return true;
      });

      return null; // suppress the break message
    },
    TAG,
  );

  // --- Self uses compass: substitute with a short notice ---
  // In the original XML this trigger is disabled by default; enabling it
  // shortens the "I'm using a compass" text in output.

  registerTokenGate(
    api,
    'kompasowi',
    /^Ukladasz urzadzenie na wyprostowanej dloni i na pare chwil wstrzymujesz oddech, by pozwolic kompasowi pokazac kierunek polnocny\.$/i,
    () => {
      const gray = getMyColor(0, api);
      const text = '.....uzywasz kompasu...';
      const buf = new api.AnsiAwareBuffer(text);
      buf.color([0, text.length], gray);
      api.output.print(buf);
      return null; // suppress original line
    },
    TAG,
  );

  // --- Compass result: substitute with a compact direction notice ---

  registerTokenGate(
    api,
    'kompasu',
    /^Uwaznie przygladasz sie ulozeniu wskazowki .* kompasu i na jej podstawie ustalasz pozostale kierunki swiata\.$/i,
    () => {
      const ansiColor = getAnsiFormatState(111, api);
      const col3 = getMyColor(3, api);

      const text = '     " * " Dalej!';
      const buf = new api.AnsiAwareBuffer(text);
      buf.color([0, text.length], ansiColor);
      buf.color([13, text.length], col3);
      api.output.print(buf);
      return null; // suppress original line
    },
    TAG,
  );
}