import type { PluginApi } from '@arkadia/plugin-types';

/**
 * ti! / ti!+ - stopwatch timer
 * ti! toggles start/stop and shows elapsed time.
 * ti!+ resets and starts a new timer.
 */
export function setupTimerAliases(api: PluginApi): void {
  let timerStart: number | null = null;

  api.aliases.register(/^ti!$/, () => {
    if (timerStart === null) {
      timerStart = Date.now();
      api.output.print('--> Czas start!');
    } else {
      const elapsed = ((Date.now() - timerStart) / 1000).toFixed(1);
      api.output.print(`--> Koniec! Czas: ${elapsed} sek.`);
      timerStart = null;
    }
    return true;
  });

  api.aliases.register(/^ti!\+$/, () => {
    timerStart = Date.now();
    api.output.print('--> Czas start! (reset)');
    return true;
  });
}
