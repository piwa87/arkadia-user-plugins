import type { PluginApi } from '@arkadia/plugin-types';
import { registerDev } from './devAlias';

// Walk speed gears: wk1 (slowest 2.5 s) → wk6 (fastest 0.3 s)
const GEAR_DELAYS = [2.5, 2.0, 1.5, 1.0, 0.6, 0.3];

export function setupMovementAliases(api: PluginApi): void {
  // set_walk → normal walk mode (moveMode = 0)
  registerDev(api, /^set_walk$/i, 'set_walk', 'tryb chód normalny (moveMode=0)', () => {
    api.events.emit('moveModeChanged', 0);
    return true;
  });

  // set_ride → carriage mode (internal client event)
  registerDev(api, /^set_ride$/i, 'set_ride', 'tryb powóz / carriage', () => {
    (api.events as any).emit('carriageModeOn');
    return true;
  });

  // alaz [dest] → walk (normal mode) to destination
  registerDev(
    api,
    /^alaz(?:\s+(.+))?$/i,
    'alaz [cel]',
    (m) => `autopilot chód${m?.[1] ? ` → ${m[1].trim()}` : ''}`,
    (matches) => {
      const dest = matches?.[1]?.trim() ?? '';
      api.events.emit('moveModeChanged', 0);
      api.command.send(dest ? `/idz ${dest}` : '/idz');
      return true;
    },
  );

  // aprze [dest] → sneak to destination (moveMode = 1)
  registerDev(
    api,
    /^aprze(?:\s+(.+))?$/i,
    'aprze [cel]',
    (m) => `autopilot skradanie${m?.[1] ? ` → ${m[1].trim()}` : ''}`,
    (matches) => {
      const dest = matches?.[1]?.trim() ?? '';
      api.events.emit('moveModeChanged', 1);
      api.command.send(dest ? `/idz ${dest}` : '/idz');
      return true;
    },
  );

  // aprzed [dest] → sneak + whole party (moveMode = 2)
  registerDev(
    api,
    /^aprzed(?:\s+(.+))?$/i,
    'aprzed [cel]',
    (m) => `autopilot skradanie z drużyną${m?.[1] ? ` → ${m[1].trim()}` : ''}`,
    (matches) => {
      const dest = matches?.[1]?.trim() ?? '';
      api.events.emit('moveModeChanged', 2);
      api.command.send(dest ? `/idz ${dest}` : '/idz');
      return true;
    },
  );

  // astop → stop walker
  registerDev(api, /^astop$/i, 'astop', 'zatrzymaj autopilota (/stop)', () => {
    api.command.send('/stop');
    return true;
  });

  // alaz2 / aprze2 / aprzed2 → resume walker after interrupt
  registerDev(api, /^a(?:laz|prze|przed)2$/i, 'alaz2 / aprze2 / aprzed2', 'wznów autopilota (/dalej)', () => {
    api.command.send('/dalej');
    return true;
  });

  // wk1–wk6 → set autopilot delay (speed gears)
  for (let i = 1; i <= 6; i++) {
    const delay = GEAR_DELAYS[i - 1];
    registerDev(
      api,
      new RegExp(`^wk${i}$`, 'i'),
      `wk${i}`,
      `prędkość ${i}/6 (opóźnienie ${delay}s)`,
      () => {
        api.command.send(`/opoz ${delay}`);
        return true;
      },
    );
  }
}
