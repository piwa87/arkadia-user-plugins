import type { PluginApi } from '@arkadia/plugin-types';

interface RaState {
  api?: any;
  webhooks?: { puf?: string };
}

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

export function setupDropMagic(api: PluginApi, state: RaState): () => void {
  const tag = 'ra:drop-magic';

  api.aliases.register(/^\/odloz_magie_ra\s*(.*)$/, (matches: any) => {
    const container = matches?.[1]?.trim() || 'skrzyni';
    const objects = api.objects.getObjectsOnLocation();
    if (!objects || objects.length === 0) {
      cecho(api, '\n<yellow>Brak przedmiotow na lokacji.\n');
      return true;
    }
    cecho(api, `\n<yellow>Odkladam magiczne przedmioty do ${container}...\n`);
    let count = 0;
    for (const obj of objects) {
      const desc = obj.desc || '';
      if (desc && obj.__category === 'rest-noncombat') {
        api.command.send(`wloz ${obj.shortcut || desc} do ${container}`);
        count++;
      }
    }
    if (count > 0) {
      cecho(api, `<green>Wyslano ${count} komend odkladania.\n`);
    } else {
      cecho(api, '<yellow>Nie znaleziono przedmiotow do odlozenia.\n');
    }
    return true;
  });

  api.triggers.register(
    /Magia (.*) przestaje dzialac/,
    (line) => {
      const matches = line.text.match(/Magia (.*) przestaje dzialac/);
      const itemDesc = matches?.[1] || '';
      cecho(api, `\n\n\t<tomato>[  MAGIK ZNIKA   ] ${itemDesc}\n\n`);
      const content = `${itemDesc} przestaje dzialac - ${new Date().toLocaleString('pl-PL')}`;
      if (state.api?.postDiscord && state.webhooks?.puf) {
        state.api.postDiscord(state.webhooks.puf, content);
      }
      return line;
    },
    tag
  );

  return () => {
    api.triggers.removeByTag(tag);
  };
}
