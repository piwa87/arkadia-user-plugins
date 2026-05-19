import type { PluginApi } from '@arkadia/plugin-types';

const SIGN_MEANINGS: Record<string, string> = {
  wrog: '⚔ WROG',
  bezpiecznie: '✓ BEZPIECZNIE',
  zaslon: '🛡 ZASLON',
  gotow: '✓ GOTOW',
  pytanie: '? PYTANIE',
  polnoc: '↑ N',
  poludnie: '↓ S',
  wschod: '→ E',
  zachod: '← W',
  'polnocny-wschod': '↗ NE',
  'polnocny-zachod': '↖ NW',
  'poludniowy-wschod': '↘ SE',
  'poludniowy-zachod': '↙ SW',
  gora: '⬆ GORA',
  dol: '⬇ DOL',
  stop: '✋ STOP',
  uwaga: '⚠ UWAGA',
  atak: '⚔ ATAK',
  odwrot: '← ODWROT',
};

function parseSigns(text: string): string {
  const quoted = text.match(/"([^"]+)"/g);
  if (!quoted) return text;
  return quoted
    .map((q) => q.replace(/"/g, ''))
    .map((word) => SIGN_MEANINGS[word] || word)
    .join(' | ');
}

interface SignsState {
  autoSwitchReleasingGuards?: boolean;
}

export function setupSigns(api: PluginApi, state: SignsState): () => void {
  const tag = 'ra:signs';

  api.triggers.register(
    /^Wykonujesz gest.*oznaczajac. (.*)\.$/,
    (_line, matches) => {
      if (!matches) return null;
      api.output.print(`\n<CadetBlue>[JA] <yellow>${parseSigns(matches[1])}\n`);
      return null;
    },
    tag,
  );

  api.triggers.register(
    /^(.+) wykonuje gest.*oznaczajac. (.*)\.$/,
    (line, matches) => {
      if (!matches) return line;
      if (matches[1].includes('wskazuje')) return line;
      api.output.print(`\n<CadetBlue>[${matches[1]}] <yellow>${parseSigns(matches[2])}\n`);
      return line;
    },
    tag,
  );

  api.triggers.register(
    /^Wskazujesz (.*) oraz wykonujesz gest.*oznaczajac. (.*)\.$/,
    (_line, matches) => {
      if (!matches) return null;
      api.output.print(`\n<CadetBlue>[JA → ${matches[1]}] <yellow>${parseSigns(matches[2])}\n`);
      return null;
    },
    tag,
  );

  api.triggers.register(
    /^(.*) wskazuje (.*) oraz wykonuje gest.*oznaczajac. (.*)\.$/,
    (_line, matches) => {
      if (!matches) return null;
      api.output.print(`\n<CadetBlue>[${matches[1]} → ${matches[2]}] <yellow>${parseSigns(matches[3])}\n`);
      return null;
    },
    tag,
  );

  api.aliases.register(/^\/trzymaj$/, () => {
    api.command.send('snprzekaz wrog, zaslon');
    return true;
  });

  api.aliases.register(/^\/puszczaj$/, () => {
    api.command.send('snprzekaz bezpiecznie, zaslon');
    return true;
  });

  api.aliases.register(/^\/zaslon\+$/, () => {
    state.autoSwitchReleasingGuards = true;
    api.output.print('\n<yellow>Automatyczne przerzucanie zaslon: <green>WLACZONE\n');
    return true;
  });

  api.aliases.register(/^\/zaslon-$/, () => {
    state.autoSwitchReleasingGuards = false;
    api.output.print('\n<yellow>Automatyczne przerzucanie zaslon: <red>WYLACZONE\n');
    return true;
  });

  api.aliases.register(/^,(.+)$/, (matches) => {
    if (!matches?.[1]) return false;
    let input = ` ${matches[1].trim()} `;
    input = input.replace(/ ne /g, ' polnocny-wschod ');
    input = input.replace(/ nw /g, ' polnocny-zachod ');
    input = input.replace(/ se /g, ' poludniowy-wschod ');
    input = input.replace(/ sw /g, ' poludniowy-zachod ');
    input = input.replace(/ n /g, ' polnoc ');
    input = input.replace(/ s /g, ' poludnie ');
    input = input.replace(/ e /g, ' wschod ');
    input = input.replace(/ w /g, ' zachod ');
    input = input.replace(/ u /g, ' gora ');
    input = input.replace(/ d /g, ' dol ');
    input = input.replace(/\?/g, ' pytanie ');
    input = input.replace(/(\d+)/g, 'liczbe $1');
    const result = input.trim().replace(/\s+/g, ', ');
    api.command.send(`snprzekaz ${result}`);
    return true;
  });

  return () => {
    api.triggers.removeByTag(tag);
  };
}
