import type { PluginApi } from '@arkadia/plugin-types';

export function setupZaslony(api: PluginApi): void {
  api.aliases.register(/^zas\!$/, () => {
    api.output.print('Ktos przed ktosiem:\n');
    api.command.send('/fake Get zrecznie zaslania zielonego trolla przed ciosami Huggusa.');
    api.output.print('Ktos przed TOBA:\n');
    api.command.send('/fake Update zrecznie zaslania zielonego trolla przed twoimi ciosami.');
    api.output.print('JA zaslaniam:\n');
    api.command.send('/fake Zrecznie zaslaniasz Huggusa przed ciosami kogostam.');
    api.output.print('MNIE zaslania:\n');
    api.command.send('/fake Banan zrecznie zaslania cie przed ciosami aligatora.');
    api.output.print('NIEUDANE:\n');
    api.command.send(
      '/fake Ktostam probuje zaslonic cie przed ciosami glupiego trolla, jednak nie jest w stanie tego uczynic.',
    );
    api.command.send('/fake Probujesz zaslonic Arbuza przed ciosami XXX, jednak nie jestes w stanie tego uczynic.');
    return true;
  });
}
