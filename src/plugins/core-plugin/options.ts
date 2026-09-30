import type { PluginApi } from '@arkadia/plugin-types';
import { getCharName } from '../../lib/getCharName';
import { registerTextAlias } from '../../lib/registerTextAlias';

const panicLevels: Record<string, string> = {
  '0': 'nigdy',
  '1': 'ledwo zywy',
  '2': 'ciezko ranny',
  '3': 'w zlej kondycji',
  '4': 'ranny',
  '5': 'lekko ranny',
  '6': 'w dobrym stanie',
  '7': 'w swietnej kondycji',
};

const gertrudaPanicLevels: Record<string, string> = {
  '0': 'nigdy',
  '1': 'ledwo zywa',
  '2': 'ciezko ranna',
  '3': 'w zlej kondycji',
  '4': 'ranna',
  '5': 'lekko ranna',
  '6': 'w dobrym stanie',
  '7': 'w swietnej kondycji',
};

const descriptionLevels: Record<string, string> = {
  '1': 'kazdej',
  '2': 'druzyny',
  '3': 'swojej',
};

export function setupOptionsAliases(api: PluginApi): void {
  // opa[0-7] - panic levels
  api.aliases.register(/^opa(\d)$/, (match) => {
    if (!match?.[1]) return false;
    const levels = getCharName(api) === 'gertruda' ? gertrudaPanicLevels : panicLevels;
    const option = levels[match[1]];
    if (option) {
      api.command.send(`opcje panika ${option}`);
      return true;
    }
    return false;
  });

  // opa - show panic options
  registerTextAlias(api, /^opa$/, 'opcje panika');

  // przyjm+/przyjm- - toggle receiving
  api.aliases.register(/^przyjm(\+|-)$/, (match) => {
    if (!match?.[1]) return false;
    const toggle = match[1] === '+' ? 'wlacz' : 'wylacz';
    api.command.send(`opcje przyjmowanie ${toggle}`);
    return true;
  });

  // op[1-3] - description levels
  api.aliases.register(/^op(\d)$/, (match) => {
    if (!match?.[1]) return false;
    const option = descriptionLevels[match[1]];
    if (option) {
      api.command.send(`opcje opisywanie ${option}`);
      return true;
    }
    return false;
  });

  // opi+/opi- - toggle brief mode
  api.aliases.register(/^opi(\+|-)$/, (match) => {
    if (!match?.[1]) return false;
    const toggle = match[1] === '+' ? '-' : '+';
    api.command.send(`opcje krotkie ${toggle}`);
    return true;
  });

  // res - show resistances
  registerTextAlias(api, /^res$/, 'odpornosci');
}
