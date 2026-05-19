import type { PluginApi } from '@arkadia/plugin-types';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes} min. ${seconds} sek.`;
  }
  return `${seconds} sek.`;
}

export function setupCombatTime(api: PluginApi): () => void {
  const tag = 'ra:combat-time';
  let inCombat = false;
  let combatStart = 0;

  api.triggers.register(
    /^Wchodzisz do walki!/,
    (line) => {
      inCombat = true;
      combatStart = Date.now();
      return line;
    },
    tag,
  );

  api.triggers.register(
    /^Koniec walki\./,
    (line) => {
      if (inCombat && combatStart > 0) {
        const duration = Date.now() - combatStart;
        api.output.print(`\n<yellow>Czas walki: <white>${formatDuration(duration)}\n`);
      }
      inCombat = false;
      combatStart = 0;
      return line;
    },
    tag,
  );

  api.aliases.register(/^\/czas_walki$/, () => {
    if (inCombat && combatStart > 0) {
      const duration = Date.now() - combatStart;
      api.output.print(`\n<yellow>Trwa walka: <white>${formatDuration(duration)}\n`);
    } else {
      api.output.print('\n<yellow>Nie jestes w walce.\n');
    }
    return true;
  });

  return () => {
    api.triggers.removeByTag(tag);
    inCombat = false;
    combatStart = 0;
  };
}
