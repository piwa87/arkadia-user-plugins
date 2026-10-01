import type { PluginApi } from '@arkadia/plugin-types';

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

function randBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

/** Start a three-hour cycle that sends `stan` every 15–25 minutes. */
export function setupIdlAlias(api: PluginApi): () => void {
  let startTime: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const scheduleNext = () => {
    if (startTime === null) return;

    const elapsed = Date.now() - startTime;
    if (elapsed >= THREE_HOURS_MS) {
      api.output.print('[IDL] Koniec 3-godzinnego cyklu.');
      startTime = null;
      timeoutId = null;
      return;
    }

    const delay = randBetween(900_000, 1_500_000); // 15–25 min
    timeoutId = setTimeout(() => {
      timeoutId = null;
      const currentStartTime = startTime;
      if (currentStartTime === null) return;

      api.command.send('stan');
      api.output.print(
        `[IDL] Wysłano 'stan' (${Math.round((Date.now() - currentStartTime) / 60000)} min z 180)`,
      );
      scheduleNext();
    }, Math.min(delay, THREE_HOURS_MS - elapsed));
  };

  api.aliases.register(/^idl$/i, () => {
    if (startTime !== null) {
      api.output.print('[IDL] Cykl już trwa.');
      return true;
    }

    startTime = Date.now();
    api.output.print('[IDL] Rusza 3-godzinny cykl "stan" co 15–25 min.');
    scheduleNext();
    return true;
  });

  return () => {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = null;
    startTime = null;
  };
}
