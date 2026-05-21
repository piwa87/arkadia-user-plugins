import type { PluginApi } from '@arkadia/plugin-types';
import type { KondycjeState } from './kondycje_triggers';

export function setupKondycjeAliases(api: PluginApi, state: KondycjeState): void {
  // k — show condition of all characters + fatigue
  api.aliases.register(/^k$/, () => {
    api.command.send('kondycja wszystkich');
    api.command.send('zmeczenie');
    return true;
  });

  // hp+ — enable full-HP sound/notify (re-arms automatically every 90 s after firing)
  api.aliases.register(/^hp\+$/, () => {
    state.hpinfo = true;
    return true;
  });

  // hp- — disable full-HP notification and cancel any pending re-arm timer
  api.aliases.register(/^hp-$/, () => {
    state.hpinfo = false;
    if (state.hpinfoTimer) {
      clearTimeout(state.hpinfoTimer);
      state.hpinfoTimer = null;
    }
    return true;
  });

  // kon — test all 7 HP states for a male and female character via /fake
  api.aliases.register(/^kon\!$/, () => {
    const states = [
      'ledwo zyw',
      'ciezko rann',
      'w zlej kondycji',
      'rann',
      'lekko rann',
      'w dobrym stanie',
      'w swietnej kondycji',
    ];
    const maleSuffix = ['y', 'y', '', 'y', 'y', '', ''];
    const femaleSuffix = ['a', 'a', '', 'a', 'a', '', ''];

    api.command.send('');
    api.command.send(`/fake Jestes w swietnej kondycji.`);

    for (let i = 0; i < states.length; i++) {
      api.command.send(`/fake Bohater jest ${states[i]}${maleSuffix[i]}.`);
    }
    api.command.send('');
    for (let i = 0; i < states.length; i++) {
      api.command.send(`/fake Bohaterka jest ${states[i]}${femaleSuffix[i]}.`);
    }
    return true;
  });
}
