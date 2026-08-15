import type { PluginApi } from '@arkadia/plugin-types';

// Equipment evaluation aliases for jens — fetch items from the room container
// for quick appraisal (ocen), then put them back.

export function setupJensOcenaSprzetu(api: PluginApi): void {
  // macka! — quick evaluation of a one-handed mace from the room container.
  // `we` runs the room-container alias (otworz <pojemnik>; wez ... z <pojemnik>).
  api.aliases.register(/^macka!$/, () => {
    api.command.send('we jednoreczna maczuge');
    api.command.send('ocen ja');
    api.command.send('odloz ja');
    return true;
  });

  // miecz! — quick evaluation of a one-handed sword from the room container.
  api.aliases.register(/^miecz!$/, () => {
    api.command.send('we jednoreczny miecz');
    api.command.send('ocen go');
    api.command.send('odloz go');
    return true;
  });

  // turn! — fetch tournament armor from the room container.
  api.aliases.register(/^turn!$/, () => {
    api.command.send('we turniejowa zbroje');
    api.command.send('ocen ja');
    api.command.send('odloz ja');
    return true;
  });
}
