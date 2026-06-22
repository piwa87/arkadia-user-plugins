import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { SoundManager } from './my-sounds-plugin/soundManager';
import { SOUNDS } from './my-sounds-plugin/sounds-data';
import { storage } from '../lib/storage';

let soundManager: SoundManager;
const SOUND_ENABLED_KEY = 'soundsEnabled';

const SOUND_ALIASES: Record<string, { name: string; debounce: number; volume: number }> = {
  play_glass: { name: 'glass', debounce: 2000, volume: 0.6 },
  play_basso: { name: 'basso', debounce: 2000, volume: 0.6 },
  play_ding: { name: 'ding', debounce: 2000, volume: 0.3 },
  play_tink: { name: 'tink', debounce: 2000, volume: 0.6 },
  play_morse: { name: 'morse', debounce: 2000, volume: 0.8 },
  play_ping: { name: 'ping', debounce: 2000, volume: 0.6 },
  play_drums: { name: 'alarm', debounce: 2000, volume: 0.6 },
  play_lowhp: { name: 'lowhp', debounce: 6000, volume: 0.6 },
  play_alarm: { name: 'alarm', debounce: 2000, volume: 0.6 },
  play_funk: { name: 'funk', debounce: 2000, volume: 0.6 },
  play_wrog: { name: 'wrog', debounce: 2000, volume: 0.6 },
  play_daytime: { name: 'daytime', debounce: 1000, volume: 0.6 },
  play_nighttime: { name: 'nighttime', debounce: 1000, volume: 0.6 },
};

function printSoundsList(api: PluginApi) {
  const buf = new api.AnsiAwareBuffer('Available Sound Aliases:');
  api.output.print(buf);

  Object.entries(SOUND_ALIASES).forEach(([alias, config]) => {
    const line = new api.AnsiAwareBuffer(`  ${alias.padEnd(18)} → ${config.name}`);
    api.output.print(line);
  });

  const helpBuf = new api.AnsiAwareBuffer(
    '\nUse: s+ (enable), s- (disable), ?sounds (show list), ?alias (show all aliases)',
  );
  api.output.print(helpBuf);
}

export async function init(api: PluginApi): Promise<PluginInfo> {
  soundManager = new SoundManager();

  // Load last saved state, default to false
  const savedEnabled = storage.get<boolean>(SOUND_ENABLED_KEY) ?? false;
  soundManager.setSoundEnabled(savedEnabled);

  // Register footer component for sounds state
  const footerHandle = api.ui.registerFooterComponent('sounds', savedEnabled ? ' 🔊' : '');

  const updateFooter = (enabled: boolean) => {
    footerHandle.setContent(enabled ? ' 🔊' : '');
  };

  // Register all sounds
  Object.entries(SOUNDS).forEach(([name, base64]) => {
    soundManager.register(name, base64);
  });

  // Register s+ and s- aliases to toggle sounds
  api.aliases.register(/^s\+$/, () => {
    soundManager.setSoundEnabled(true);
    storage.set(SOUND_ENABLED_KEY, true);
    updateFooter(true);
    api.output.print('Sounds enabled');
    return true;
  });

  api.aliases.register(/^s-$/, () => {
    soundManager.setSoundEnabled(false);
    storage.set(SOUND_ENABLED_KEY, false);
    updateFooter(false);
    api.output.print('Sounds disabled');
    return true;
  });

  // Handle ?sounds command - show all available sound aliases
  api.aliases.register(/^\?sounds$/i, () => {
    printSoundsList(api);
    return true;
  });

  // Register play_* aliases
  Object.entries(SOUND_ALIASES).forEach(([alias, config]) => {
    api.aliases.register(new RegExp(`^${alias}$`, 'i'), () => {
      if (config.debounce > 0) {
        soundManager.playDebounced(config.name, config.debounce, config.volume);
      } else {
        soundManager.play(config.name, config.volume);
      }
      return true;
    });
  });

  const info: PluginInfo = {
    name: 'Sounds',
    version: '1.0.0',
    author: 'Piot',
    description: '?sounds = pomoc',
  };
  api.output.print(`[${info.name} v${info.version}] loaded`);
  return info;
}
