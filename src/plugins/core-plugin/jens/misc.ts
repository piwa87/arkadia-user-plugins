import type { PluginApi } from '@arkadia/plugin-types';

/**
 * Jens-specific aliases: hide/show in association (signet ring),
 * and door unlocking with the signet ring.
 */
export function setupJensMisc(api: PluginApi): void {
  // tl - wrinkled envelope (Jens-specific mail title)
  api.aliases.register(/^tl$/i, () => {
    api.command.send('Pomieta koperta');
    return true;
  });

  // hide+ - hide from association listing and stash signet ring
  api.aliases.register(/^hide\+$/, () => {
    api.command.send('opcje stowarzyszenie -');
    api.command.send('snzsun');
    return true;
  });

  // hide- - appear in association listing and wear signet ring
  api.aliases.register(/^hide-$/, () => {
    api.command.send('opcje stowarzyszenie +');
    api.command.send('wsun kunsztowny sygnet na palec serdeczny');
    return true;
  });

  // radoor [door] [direction] - open door with ring, go through, re-lock
  api.aliases.register(/^radoor\s+(\S+)\s+(\S+)$/, (matches) => {
    const co = matches![1];
    const kier = matches![2];
    api.command.send(`otworz ${co} kunsztownym sygnetem`);
    api.command.send(kier);
    api.command.send(`zamknij ${co}`);
    api.command.send(`zamknij ${co} kunsztownym sygnetem`);
    return true;
  });
}