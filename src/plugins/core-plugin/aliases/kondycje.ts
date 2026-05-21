import type { PluginApi } from '@arkadia/plugin-types';
import type { KondycjeState } from '../triggers/kondycje';

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

  // zla+ — enable the bad-condition (w zlej kondycji) alert for the player
  api.aliases.register(/^zla\+$/, () => {
    state.playerBadCondEnabled = true;
    return true;
  });

  // zla- — disable the bad-condition alert (also clears any pending escape direction)
  api.aliases.register(/^zla-$/, () => {
    state.playerBadCondEnabled = false;
    return true;
  });

  // forma! — enable barely-alive (ledwo zyw) auto-assist trigger
  api.aliases.register(/^forma!$/, () => {
    state.playerLedwoEnabled = true;
    api.command.send('sig Wspomaganie formy wlaczone.');
    return true;
  });

  // kon — test all 7 HP states for a male and female character via /fake
  api.aliases.register(/^kon$/, () => {
    const states = [
      'ledwo zyw', 'ciezko rann', 'w zlej kondycji',
      'rann', 'lekko rann', 'w dobrym stanie', 'w swietnej kondycji',
    ];
    const maleSuffix   = ['y', 'y', '', 'y', 'y', '', ''];
    const femaleSuffix = ['a', 'a', '', 'a', 'a', '', ''];

    for (let i = 0; i < states.length; i++) {
      api.command.send(`/fake Bohater jest ${states[i]}${maleSuffix[i]}.`);
    }
    for (let i = 0; i < states.length; i++) {
      api.command.send(`/fake Bohaterka jest ${states[i]}${femaleSuffix[i]}.`);
    }
    return true;
  });
}
