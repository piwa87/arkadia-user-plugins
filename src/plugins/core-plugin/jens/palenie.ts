import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../../lib/registerTextAlias';

const BOX_NOM = 'metalowe pudelko';
const BOX_GEN = 'metalowego pudelka';
const TAG = 'palenie';

function splitCompositeList(text: string): string[] {
  return text.split(/,\s*|\s+i\s+/).map(s => s.trim()).filter(Boolean);
}

export function setupPalenie(api: PluginApi): () => void {
  const ids: string[] = [];

  // tytind - load tobacco into box
  ids.push(api.aliases.register(/^tytind$/, () => {
    api.command.send(`otworz ${BOX_NOM}`);
    api.command.send(`wloz ziola do ${BOX_GEN}`);
    api.command.send(`zamknij ${BOX_NOM}`);
    return true;
  }));

  // tytud - take tobacco out of box
  ids.push(api.aliases.register(/^tytud$/, () => {
    api.command.send(`otworz ${BOX_NOM}`);
    api.command.send(`wez ziolo z ${BOX_GEN}`);
    api.command.send(`zamknij ${BOX_NOM}`);
    return true;
  }));

  // smoke - full pipe smoking sequence (inlines tytud)
  ids.push(api.aliases.register(/^smoke$/, () => {
    api.command.send('ot');
    api.command.send(`wyj ${BOX_NOM}`);
    api.command.send(`otworz ${BOX_NOM}`);
    api.command.send(`wez ziolo z ${BOX_GEN}`);
    api.command.send(`zamknij ${BOX_NOM}`);
    api.command.send(`zajrzyj do ${BOX_GEN}`);
    api.command.send(`wlz ${BOX_NOM}`);
    api.command.send('wyj fajke');
    api.command.send('odtrocz fajke');
    api.command.send('wyczysc fajke');
    api.command.send('nabij fajke ziolem');
    api.command.send('zapal fajke');
    return true;
  }));

  // smokec - cigar smoking sequence
  ids.push(api.aliases.register(/^smokec$/, () => {
    api.command.send('wyj wypalone cygara');
    api.command.send('odloz wypalone cygara');
    api.command.send('wyj niewielkie pudelko');
    api.command.send('wysun cygaro z pudelka');
    api.command.send('wlz pudelko');
    api.command.send('zapal cygaro');
    return true;
  }));

  // skod - clean ashtray
  ids.push(registerTextAlias(api, /^skod$/, 'pastrac popiol'));

  // cyg - quick cigar (put away finished, take new, light)
  ids.push(api.aliases.register(/^cyg$/, () => {
    api.command.send('odloz wypalone cygara');
    api.command.send('wyj cygaro');
    api.command.send('zapal cygaro');
    return true;
  }));

  // container peek — print each item found inside
  api.triggers.register(
    /Zagladasz do .*, sprawdzajac jego zawartosc\. W srodku dostrzegasz (.*)\./,
    (line, matches) => {
      for (const item of splitCompositeList(matches?.[1] ?? '')) {
        api.output.print(`--> ${item}`);
      }
      return line;
    },
    TAG,
  );

  return () => {
    for (const id of ids) api.aliases.remove(id);
    api.triggers.removeByTag(TAG);
  };
}
