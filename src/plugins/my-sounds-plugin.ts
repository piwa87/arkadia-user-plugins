import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { SoundManager } from './my-sounds-plugin/soundManager';
import { SOUNDS } from './my-sounds-plugin/sounds-data';

let soundManager: SoundManager;

const SOUND_ALIASES: Record<string, { name: string; debounce: number; volume: number }> = {
  play_glass: { name: 'glass', debounce: 1000, volume: 0.6 },
  play_basso: { name: 'basso', debounce: 1000, volume: 0.7 },
  play_ding: { name: 'ding', debounce: 2000, volume: 0.6 },
  play_tink: { name: 'tink', debounce: 1000, volume: 0.5 },
  play_morse: { name: 'morse', debounce: 1000, volume: 0.5 },
  play_ping: { name: 'ping', debounce: 1000, volume: 0.7 },
  play_drums: { name: 'alarm', debounce: 1500, volume: 0.8 },
  play_lowhp: { name: 'lowhp', debounce: 1000, volume: 0.7 },
  play_alarm: { name: 'alarm', debounce: 1000, volume: 0.8 },
  play_funk: { name: 'funk', debounce: 1000, volume: 0.6 },
  play_wrog: { name: 'wrog', debounce: 1000, volume: 0.7 },
  play_daytime: { name: 'daytime', debounce: 0, volume: 0.5 },
  play_nighttime: { name: 'nighttime', debounce: 0, volume: 0.5 },
};

function printSoundsList(api: PluginApi) {
  const buf = new api.AnsiAwareBuffer('Available Sound Aliases:');
  api.output.print(buf);

  Object.entries(SOUND_ALIASES).forEach(([alias, config]) => {
    const line = new api.AnsiAwareBuffer(`  ${alias.padEnd(18)} → ${config.name}`);
    api.output.print(line);
  });

  const helpBuf = new api.AnsiAwareBuffer('\nUse: s+ (enable), s- (disable), ?sounds (show list), ?alias (show all aliases)');
  api.output.print(helpBuf);
}

export async function init(api: PluginApi): Promise<PluginInfo> {
  const tag = 'mySounds';
  soundManager = new SoundManager();

  // Register all sounds
  Object.entries(SOUNDS).forEach(([name, base64]) => {
    soundManager.register(name, base64);
  });

  // Listen for s+ and s- commands from aliases
  api.triggers.register(
    /^sig Dzwieki (ON|OFF)$/,
    (line) => {
      const isOn = line.text.includes('ON');
      soundManager.setSoundEnabled(isOn);
      return line;
    },
    tag,
  );

  // Handle ?sounds command - show all available sound aliases
  api.triggers.register(
    /^\?sounds\s*$/i,
    () => {
      printSoundsList(api);
      return null; // Hide the trigger line
    },
    tag,
  );

  // Handle play_* aliases - listen for echoed commands
  api.triggers.register(
    /^(play_\w+)\s*$/i,
    (line) => {
      const alias = line.text.trim().toLowerCase();
      const config = SOUND_ALIASES[alias];

      if (config) {
        if (config.debounce > 0) {
          soundManager.playDebounced(config.name, config.debounce, config.volume);
        } else {
          soundManager.play(config.name, config.volume);
        }
      }

      return line;
    },
    tag,
  );

  const info: PluginInfo = {
    name: 'My Sounds',
    version: '0.2.0',
    description: 'Sound effects system with debouncing - type ?sounds for list',
  };
  api.output.print(`[${info.name} v${info.version}] loaded`);
  api.output.print('Type ?sounds to see available sound aliases, s+ to enable, s- to disable');
  return info;
}
