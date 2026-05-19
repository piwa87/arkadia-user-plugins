import type { PluginApi } from '@arkadia/plugin-types';
import { colorToHex } from './stones';

interface BottleInfo {
  mask: string;
  color: string;
}

const BOTTLE_INFO: Record<string, BottleInfo> = {
  'bialy trojkatny flakonik': { mask: '+reg mana', color: 'dodger_blue' },
  'bialy kwadratowy flakonik': { mask: '+reg mana', color: 'dodger_blue' },
  'bialy pieciokatny flakonik': { mask: '+reg mana', color: 'dodger_blue' },
  'bialy szesciokatny flakonik': { mask: '+reg mana', color: 'dodger_blue' },
  'bialy okragly flakonik': { mask: '+reg mana', color: 'dodger_blue' },
  'bialy maly flakonik': { mask: '+reg mana', color: 'dodger_blue' },
  'srebrny trojkatny flakonik': { mask: '+reg zmc', color: 'LightGoldenrod' },
  'srebrny kwadratowy flakonik': { mask: '+reg zmc', color: 'LightGoldenrod' },
  'srebrny pieciokatny flakonik': { mask: '+reg zmc', color: 'LightGoldenrod' },
  'srebrny szesciokatny flakonik': { mask: '+reg zmc', color: 'LightGoldenrod' },
  'srebrny okragly flakonik': { mask: '+reg zmc', color: 'LightGoldenrod' },
  'srebrny maly flakonik': { mask: '+reg zmc', color: 'LightGoldenrod' },
  'puprpurowy trojkatny flakonik': { mask: '+odp spaczen', color: 'DarkSlateGray' },
  'puprpurowy kwadratowy flakonik': { mask: '+odp spaczen', color: 'DarkSlateGray' },
  'puprpurowy pieciokatny flakonik': { mask: '+odp spaczen', color: 'DarkSlateGray' },
  'puprpurowy szesciokatny flakonik': { mask: '+odp spaczen', color: 'DarkSlateGray' },
  'puprpurowy okragly flakonik': { mask: '+odp spaczen', color: 'DarkSlateGray' },
  'puprpurowy maly flakonik': { mask: '+odp spaczen', color: 'DarkSlateGray' },
  'niebieski trojkatny flakonik': { mask: '+odtr', color: 'LightGoldenrod' },
  'niebieski kwadratowy flakonik': { mask: '+odtr', color: 'LightGoldenrod' },
  'niebieski pieciokatny flakonik': { mask: '+odtr', color: 'LightGoldenrod' },
  'niebieski szesciokatny flakonik': { mask: '+odtr', color: 'LightGoldenrod' },
  'niebieski okragly flakonik': { mask: '+odtr', color: 'LightGoldenrod' },
  'niebieski maly flakonik': { mask: '+odtr', color: 'LightGoldenrod' },
  'czerwony trojkatny flakonik': { mask: '+wyt', color: 'ansi_light_cyan' },
  'czerwony kwadratowy flakonik': { mask: '+wyt', color: 'ansi_light_cyan' },
  'czerwony pieciokatny flakonik': { mask: '+wyt', color: 'ansi_light_cyan' },
  'czerwony szesciokatny flakonik': { mask: '+wyt', color: 'ansi_light_cyan' },
  'czerwony okragly flakonik': { mask: '+wyt', color: 'ansi_light_cyan' },
  'czerwony maly flakonik': { mask: '+wyt', color: 'ansi_light_cyan' },
  'zielony trojkatny flakonik': { mask: '+zr [+2]', color: 'orange_red' },
  'zielony kwadratowy flakonik': { mask: '+zr [+2]', color: 'orange_red' },
  'zielony pieciokatny flakonik': { mask: '+zr [+2]', color: 'orange_red' },
  'zielony szesciokatny flakonik': { mask: '+zr [+2]', color: 'orange_red' },
  'zielony okragly flakonik': { mask: '+zr [+2]', color: 'orange_red' },
  'zielony maly flakonik': { mask: '+zr [+2]', color: 'orange_red' },
  'pomaranczowy trojkatny flakonik': { mask: '+reg hp', color: 'red' },
  'pomaranczowy kwadratowy flakonik': { mask: '+reg hp', color: 'red' },
  'pomaranczowy pieciokatny flakonik': { mask: '+reg hp', color: 'red' },
  'pomaranczowy szesciokatny flakonik': { mask: '+reg hp', color: 'red' },
  'pomaranczowy okragly flakonik': { mask: '+reg hp', color: 'red' },
  'pomaranczowy maly flakonik': { mask: '+reg hp', color: 'red' },
  'zolty trojkatny flakonik': { mask: '+sila', color: 'green_yellow' },
  'zolty kwadratowy flakonik': { mask: '+sila', color: 'green_yellow' },
  'zolty pieciokatny flakonik': { mask: '+sila', color: 'green_yellow' },
  'zolty szesciokatny flakonik': { mask: '+sila', color: 'green_yellow' },
  'zolty okragly flakonik': { mask: '+sila', color: 'green_yellow' },
  'zolty maly flakonik': { mask: '+sila', color: 'green_yellow' },
  'szmaragdowy trojkatny flakonik': { mask: '+zimno', color: 'DeepSkyBlue' },
  'szmaragdowy kwadratowy flakonik': { mask: '+zimno', color: 'DeepSkyBlue' },
  'szmaragdowy pieciokatny flakonik': { mask: '+zimno', color: 'DeepSkyBlue' },
  'szmaragdowy szesciokatny flakonik': { mask: '+zimno', color: 'DeepSkyBlue' },
  'szmaragdowy okragly flakonik': { mask: '+zimno', color: 'DeepSkyBlue' },
  'szmaragdowy maly flakonik': { mask: '+zimno', color: 'DeepSkyBlue' },
  'czarny trojkatny flakonik': { mask: '+oparzenia', color: 'yellow' },
  'czarny kwadratowy flakonik': { mask: '+oparzenia', color: 'yellow' },
  'czarny pieciokatny flakonik': { mask: '+oparzenia', color: 'yellow' },
  'czarny szesciokatny flakonik': { mask: '+oparzenia', color: 'yellow' },
  'czarny okragly flakonik': { mask: '+oparzenia', color: 'yellow' },
  'czarny maly flakonik': { mask: '+oparzenia', color: 'yellow' }
};

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

export function setupGaging(api: PluginApi): () => void {
  const tag = 'ra:gaging';

  for (const [bottleName, info] of Object.entries(BOTTLE_INFO)) {
    api.triggers.register(
      new RegExp(bottleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      (line) => {
        const idx = line.text.indexOf(bottleName);
        if (idx !== -1) {
          const effectColor = api.colors.fromHex(colorToHex(info.color));
          line.append(` (${info.mask})`, effectColor);
        }
        return line;
      },
      tag
    );
  }

  api.aliases.register(/^\/flakoniki$/, () => {
    cecho(api, '\n\n\t<yellow>Dostepne informacje o flakonikach i ich wlasciwosciach:\n');
    const sortedEntries = Object.entries(BOTTLE_INFO).sort(([a], [b]) => a.localeCompare(b));
    for (const [name, info] of sortedEntries) {
      cecho(api, `\n <MediumSeaGreen> - ${name} <${info.color}>${info.mask}`);
    }
    cecho(api, '\n\n');
    return true;
  });

  return () => {
    api.triggers.removeByTag(tag);
  };
}
