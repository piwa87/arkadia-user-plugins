import type { PluginApi } from '@arkadia/plugin-types';

interface DetoxHerbs {
  [herb: string]: string;
}

const DETOX: Record<string, DetoxHerbs> = {
  'chorobe zakazna': {
    bylica_cytwarowa: 'wetrzyj',
    bylica_piolun: 'wetrzyj',
    bez: 'przezuj',
    krzyzownica: 'przezuj',
    czosnek: 'wetrzyj',
    ususzony_czosnek: 'wetrzyj',
    szalwia: 'przyloz'
  },
  'chorobe skory': {
    rumianek: 'przyloz',
    lukrecja: 'przyloz',
    nawloc: 'przyloz',
    ususzony_starzec: 'sproszkuj',
    deren: 'przezuj',
    ususzony_przelot: 'sproszkuj',
    ususzony_jaskier: 'rozkrusz'
  },
  'gadzi jad': {
    centuria: 'zjedz',
    rdest_wezownik: 'przezuj',
    krzyzownica: 'przezuj',
    pieciornik: 'przezuj',
    barwinek: 'zjedz',
    rauwolfia: 'przezuj',
    ususzona_mandragora: 'przyloz',
    siezygron: 'rozgryz',
    ususzona_boldoa: 'rozkrusz'
  },
  'jad insekta': {
    chaber: 'przezuj',
    pieciornik: 'przezuj',
    barwinek: 'zjedz',
    ususzona_mandragora: 'przezuj',
    nostrzyk: 'przezuj',
    siezygron: 'rozgryz',
    ususzona_macznica: 'rozgryz',
    ususzona_boldoa: 'rozkrusz'
  },
  'toksyna roslinna': {
    chaber: 'przezuj',
    pieciornik: 'przezuj',
    ususzona_mandragora: 'rozkrusz',
    nostrzyk: 'przezuj',
    siezygron: 'rozgryz',
    ususzona_boldoa: 'rozkrusz'
  },
  'chorobe ukladu pokarmowego': {
    rumianek: 'powachaj',
    centuria: 'zjedz',
    nawloc: 'rozgryz',
    bez: 'przezuj',
    ususzona_mandragora: 'rozkrusz',
    nostrzyk: 'przezuj',
    ususzona_boldoa: 'rozkrusz',
    dziewanna: 'zjedz',
    szczaw: 'przezuj'
  },
  'chorobe pluc': {
    chaber: 'powachaj',
    plucnica: 'sproszkuj',
    dziewanna: 'zjedz'
  },
  'pasozyty': {
    bagno: 'przyloz',
    bylica_cytwarowa: 'wetrzyj',
    bylica_piolun: 'wetrzyj',
    wrotycz: 'przyloz'
  },
  'kac': {
    tojad: 'przyloz',
    ususzona_rosiczka: 'polknij',
    bulawinka: 'przezuj'
  },
  'ogolne odtrucie': {
    ranog: 'zjedz',
    ususzony_ranog: 'zjedz'
  }
};

function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

export function setupDetox(api: PluginApi): () => void {
  api.aliases.register(/^\/dolegliwosci$/, () => {
    cecho(api, "\n<green> Tymi ziolami mozesz sprobowac uleczyc nastepujace dolegliwosci:\n");
    const herbBags = api.herbs.getBags();
    const herbCounts: Record<string, number> = {};
    if (herbBags) {
      for (const bag of Object.values(herbBags)) {
        if (bag && bag.herbs) {
          for (const [herb, count] of Object.entries(bag.herbs)) {
            herbCounts[herb] = (herbCounts[herb] || 0) + count;
          }
        }
      }
    }
    for (const [condition, herbs] of Object.entries(DETOX).sort()) {
      cecho(api, `
<green>  ${titleCase(condition)}:
`);
      for (const [herb, action] of Object.entries(herbs)) {
        const count = herbCounts[herb] || 0;
        if (count > 0) {
          cecho(api, `   <light_slate_blue>/z_${action} ${herb} 1<grey> lub <light_slate_blue>/wezz ${herb} 1<grey> - dostepna ilosc; ${count}
`);
        }
      }
    }
    cecho(api, "\n");
    return true;
  });

  api.aliases.register(/^\/dolegliwosci!$/, () => {
    cecho(api, "\n<green> Tymi ziolami mozesz sprobowac uleczyc nastepujace dolegliwosci:\n");
    for (const [condition, herbs] of Object.entries(DETOX).sort()) {
      cecho(api, `
<green>  ${titleCase(condition)}:
`);
      for (const [herb, action] of Object.entries(herbs)) {
        cecho(api, `   /z_${action} ${herb} 1
`);
      }
    }
    cecho(api, "\n");
    return true;
  });

  api.aliases.register(/^\/trad$/, () => {
    cecho(api, "\n<green> Tymi ziolami mozesz sprobowac uleczyc trad i zwiazane z nim choroby:\n");
    const herbBags = api.herbs.getBags();
    const herbCounts: Record<string, number> = {};
    if (herbBags) {
      for (const bag of Object.values(herbBags)) {
        if (bag && bag.herbs) {
          for (const [herb, count] of Object.entries(bag.herbs)) {
            herbCounts[herb] = (herbCounts[herb] || 0) + count;
          }
        }
      }
    }
    for (const [condition, herbs] of Object.entries(DETOX).sort()) {
      if (condition === 'chorobe zakazna' || condition === 'chorobe skory') {
        cecho(api, `
<green>  ${titleCase(condition)}:
`);
        for (const [herb, action] of Object.entries(herbs)) {
          const count = herbCounts[herb] || 0;
          if (count > 0) {
            cecho(api, `   <light_slate_blue>/z_${action} ${herb} 1<grey> - dostepna ilosc; ${count}
`);
          }
        }
      }
    }
    cecho(api, "\n");
    return true;
  });

  api.aliases.register(/^\/trad!$/, () => {
    cecho(api, "\n<green> Tymi ziolami mozesz sprobowac uleczyc trad i zwiazane z nim choroby:\n");
    for (const [condition, herbs] of Object.entries(DETOX).sort()) {
      if (condition === 'chorobe zakazna' || condition === 'chorobe skory') {
        cecho(api, `
<green>  ${titleCase(condition)}:
`);
        for (const [herb, action] of Object.entries(herbs)) {
          cecho(api, `   /z_${action} ${herb} 1
`);
        }
      }
    }
    cecho(api, "\n");
    return true;
  });

  return () => {};
}
