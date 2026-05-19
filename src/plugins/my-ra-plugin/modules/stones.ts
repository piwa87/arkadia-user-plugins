import type { PluginApi } from '@arkadia/plugin-types';

interface StoneInfo {
  effect: string;
  color: string;
}

const STONES: Record<string, StoneInfo> = {
  // Czysta magia
  'fioletowy ametyst': { effect: 'czysta magia [+10]', color: 'ansi_magenta' },
  'fioletowe ametysty': { effect: 'czysta magia [+10]', color: 'ansi_magenta' },
  'fioletowych ametystow': { effect: 'czysta magia [+10]', color: 'ansi_magenta' },
  'wielobarwny oliwin': { effect: 'czysta magia [+20]', color: 'ansi_magenta' },
  'wielobarwne oliwiny': { effect: 'czysta magia [+20]', color: 'ansi_magenta' },
  'wielobarwnych oliwinow': { effect: 'czysta magia [+20]', color: 'ansi_magenta' },
  'lazurowy kyanit': { effect: 'R czysta magia [+20]', color: 'ansi_magenta' },
  'lazurowe kyanity': { effect: 'R czysta magia [+20]', color: 'ansi_magenta' },
  'lazurowych kyanitow': { effect: 'R czysta magia [+20]', color: 'ansi_magenta' },
  'skrzacy aleksandryt': { effect: 'czysta magia [+20]', color: 'ansi_magenta' },
  'skrzace aleksandryty': { effect: 'czysta magia [+20]', color: 'ansi_magenta' },
  'skrzacych aleksandrytow': { effect: 'czysta magia [+20]', color: 'ansi_magenta' },
  'wielobarwny labrador': { effect: 'czysta magia [+10]', color: 'ansi_magenta' },
  'wielobarwne labradory': { effect: 'czysta magia [+10]', color: 'ansi_magenta' },
  'wielobarwnych labradorow': { effect: 'czysta magia [+10]', color: 'ansi_magenta' },
  // Elektrycznosc
  'szaroniebieski granat': { effect: 'R elektrycznosc [+20]', color: 'ansiLightYellow' },
  'szaroniebieskie granaty': { effect: 'R elektrycznosc [+20]', color: 'ansiLightYellow' },
  'szaroniebieskich granatow': { effect: 'R elektrycznosc [+20]', color: 'ansiLightYellow' },
  'wzorzysty onyks': { effect: 'elektrycznosc [+10]', color: 'ansiLightYellow' },
  'wzorzyste onyksy': { effect: 'elektrycznosc [+10]', color: 'ansiLightYellow' },
  'wzorzystych onyksow': { effect: 'elektrycznosc [+10]', color: 'ansiLightYellow' },
  'wielobarwny turmalin': { effect: 'elektrycznosc [+20]', color: 'ansiLightYellow' },
  'wielobarwne turmaliny': { effect: 'elektrycznosc [+20]', color: 'ansiLightYellow' },
  'wielobarwnych turmalinow': { effect: 'elektrycznosc [+20]', color: 'ansiLightYellow' },
  // Kwas
  'szmaragdowozielony chryzoberyl': { effect: 'R kwas [+10]', color: 'LawnGreen' },
  'szmaragdowozielone chryzoberyle': { effect: 'R kwas [+10]', color: 'LawnGreen' },
  'szmaragdowozielonych chryzoberylow': { effect: 'R kwas [+10]', color: 'LawnGreen' },
  'zielony diopsyd': { effect: 'R kwas [+20]', color: 'LawnGreen' },
  'zielone diopsydy': { effect: 'R kwas [+20]', color: 'LawnGreen' },
  'zielonych diopsydow': { effect: 'R kwas [+20]', color: 'LawnGreen' },
  'zielonkawy awenturyn': { effect: 'kwas [+10]', color: 'LawnGreen' },
  'zielonkawe awenturyny': { effect: 'kwas [+10]', color: 'LawnGreen' },
  'zielonkawych awenturynow': { effect: 'kwas [+10]', color: 'LawnGreen' },
  'oliwkowozielony serpentyn': { effect: 'kwas [+10]', color: 'LawnGreen' },
  'oliwkowozielone serpentyny': { effect: 'kwas [+10]', color: 'LawnGreen' },
  'oliwkowozielonych serpentynow': { effect: 'kwas [+10]', color: 'LawnGreen' },
  'zoltawozielony szmaragd': { effect: 'R kwas [+20]', color: 'LawnGreen' },
  'zoltawozielone szmaragdy': { effect: 'R kwas [+20]', color: 'LawnGreen' },
  'zoltawozielonych szmaragdow': { effect: 'R kwas [+20]', color: 'LawnGreen' },
  'ciemnozielony malachit': { effect: 'kwas [+10]', color: 'LawnGreen' },
  'ciemnozielone malachity': { effect: 'kwas [+10]', color: 'LawnGreen' },
  'ciemnozielonych malachitow': { effect: 'kwas [+10]', color: 'LawnGreen' },
  'jasnozielony chryzopraz': { effect: 'R kwas [+10]', color: 'LawnGreen' },
  'jasnozielone chryzoprazy': { effect: 'R kwas [+10]', color: 'LawnGreen' },
  'jasnozielonych chryzoprazow': { effect: 'R kwas [+10]', color: 'LawnGreen' },
  // Magia smierci
  'nakrapiany jaspis': { effect: 'magia smierci [+10]', color: 'DarkSlateGray' },
  'nakrapiane jaspisy': { effect: 'magia smierci [+10]', color: 'DarkSlateGray' },
  'nakrapianych jaspisow': { effect: 'magia smierci [+10]', color: 'DarkSlateGray' },
  'czarny gagat': { effect: 'magia smierci [+10]', color: 'DarkSlateGray' },
  'czarne gagaty': { effect: 'magia smierci [+10]', color: 'DarkSlateGray' },
  'czarnych gagatow': { effect: 'magia smierci [+10]', color: 'DarkSlateGray' },
  'szaroczarny hematyt': { effect: 'magia smierci [+10]', color: 'DarkSlateGray' },
  'szaroczarne hematyty': { effect: 'magia smierci [+10]', color: 'DarkSlateGray' },
  'szaroczarnych hematytow': { effect: 'magia smierci [+10]', color: 'DarkSlateGray' },
  'czerwonobrazowy karneol': { effect: 'magia smierci [+10]', color: 'DarkSlateGray' },
  'czerwonobrazowe karneole': { effect: 'magia smierci [+10]', color: 'DarkSlateGray' },
  'czerwonobrazowych karneolow': { effect: 'magia smierci [+10]', color: 'DarkSlateGray' },
  'czarny opal': { effect: 'R magia smierci [+20]', color: 'DarkSlateGray' },
  'czarne opale': { effect: 'R magia smierci [+20]', color: 'DarkSlateGray' },
  'czarnych opali': { effect: 'R magia smierci [+20]', color: 'DarkSlateGray' },
  // Magia umyslu
  'bezbarwny ortoklaz': { effect: 'R magia umyslu [+20]', color: 'ansi_light_cyan' },
  'bezbarwne ortoklazy': { effect: 'R magia umyslu [+20]', color: 'ansi_light_cyan' },
  'bezbarwnych ortoklazow': { effect: 'R magia umyslu [+20]', color: 'ansi_light_cyan' },
  'pasiasty fluoryt': { effect: 'magia umyslu [+10]', color: 'ansi_light_cyan' },
  'pasiaste fluoryty': { effect: 'magia umyslu [+10]', color: 'ansi_light_cyan' },
  'pasiastych fluorytow': { effect: 'magia umyslu [+10]', color: 'ansi_light_cyan' },
  'bialy opal': { effect: 'magia umyslu [+20]', color: 'ansi_light_cyan' },
  'biale opale': { effect: 'magia umyslu [+20]', color: 'ansi_light_cyan' },
  'bialych opali': { effect: 'magia umyslu [+20]', color: 'ansi_light_cyan' },
  'zlocisty piryt': { effect: 'magia umyslu [+10]', color: 'ansi_light_cyan' },
  'zlociste piryty': { effect: 'magia umyslu [+10]', color: 'ansi_light_cyan' },
  'zlocistych pirytow': { effect: 'magia umyslu [+10]', color: 'ansi_light_cyan' },
  'bezbarwny diament': { effect: 'R magia umyslu [+20]', color: 'ansi_light_cyan' },
  'bezbarwne diamenty': { effect: 'R magia umyslu [+20]', color: 'ansi_light_cyan' },
  'bezbarwnych diamentow': { effect: 'R magia umyslu [+20]', color: 'ansi_light_cyan' },
  // Ogien
  'krwistoczerwony rubin': { effect: 'ogien [+20]', color: 'red' },
  'krwistoczerwone rubiny': { effect: 'ogien [+20]', color: 'red' },
  'krwistoczerwonych rubinow': { effect: 'ogien [+20]', color: 'red' },
  'ognisty agat': { effect: 'ogien [+10]', color: 'red' },
  'ogniste agaty': { effect: 'ogien [+10]', color: 'red' },
  'ognistych agatow': { effect: 'ogien [+10]', color: 'red' },
  'krwisty rodolit': { effect: 'ogien [+10]', color: 'red' },
  'krwiste rodolity': { effect: 'ogien [+10]', color: 'red' },
  'krwistych rodolitow': { effect: 'ogien [+10]', color: 'red' },
  'ciemnoczerwony topaz': { effect: 'R ogien [+30]', color: 'red' },
  'ciemnoczerwone topazy': { effect: 'R ogien [+30]', color: 'red' },
  'ciemnoczerwonych topazow': { effect: 'R ogien [+30]', color: 'red' },
  'zoltawozielony apatyt': { effect: 'R ogien [+20]', color: 'red' },
  'zoltawozielone apatyty': { effect: 'R ogien [+20]', color: 'red' },
  'zoltawozielonych apatytow': { effect: 'R ogien [+20]', color: 'red' },
  // Powietrze
  'niebieski azuryt': { effect: 'powietrze [+10]', color: 'LightGoldenrod' },
  'niebieskie azuryty': { effect: 'powietrze [+10]', color: 'LightGoldenrod' },
  'niebieskich azurytow': { effect: 'powietrze [+10]', color: 'LightGoldenrod' },
  'purpurowoniebieski lazuryt': { effect: 'powietrze [+10]', color: 'LightGoldenrod' },
  'purpurowoniebieskie lazuryty': { effect: 'powietrze [+10]', color: 'LightGoldenrod' },
  'purpurowoniebieskich lazurytow': { effect: 'powietrze [+10]', color: 'LightGoldenrod' },
  'fioletowy szafir': { effect: 'R powietrze [+20]', color: 'LightGoldenrod' },
  'fioletowe szafiry': { effect: 'R powietrze [+20]', color: 'LightGoldenrod' },
  'fioletowych szafirow': { effect: 'R powietrze [+20]', color: 'LightGoldenrod' },
  'jasnozielony nefryt': { effect: 'powietrze [+10]', color: 'LightGoldenrod' },
  'jasnozielone nefryty': { effect: 'powietrze [+10]', color: 'LightGoldenrod' },
  'jasnozielonych nefrytow': { effect: 'powietrze [+10]', color: 'LightGoldenrod' },
  // Woda
  'niebieskozielony akwamaryn': { effect: 'R woda [+20]', color: 'dodger_blue' },
  'niebieskozielone akwamaryny': { effect: 'R woda [+20]', color: 'dodger_blue' },
  'niebieskozielonych akwamarynow': { effect: 'R woda [+20]', color: 'dodger_blue' },
  'purpurowy iolit': { effect: 'R woda [+20]', color: 'dodger_blue' },
  'purpurowe iolity': { effect: 'R woda [+20]', color: 'dodger_blue' },
  'purpurowych iolitow': { effect: 'R woda [+20]', color: 'dodger_blue' },
  'czarna perla': { effect: 'woda [+30]', color: 'dodger_blue' },
  'czarna perle': { effect: 'woda [+30]', color: 'dodger_blue' },
  'czarne perly': { effect: 'woda [+30]', color: 'dodger_blue' },
  'czarnych perel': { effect: 'woda [+30]', color: 'dodger_blue' },
  'biala perla': { effect: 'woda [+20]', color: 'dodger_blue' },
  'biala perle': { effect: 'woda [+20]', color: 'dodger_blue' },
  'biale perly': { effect: 'woda [+20]', color: 'dodger_blue' },
  'bialych perel': { effect: 'woda [+20]', color: 'dodger_blue' },
  // Ziemia
  'zoltawobrazowy monacyt': { effect: 'ziemia [+10]', color: 'orange_red' },
  'zoltawobrazowe monacyty': { effect: 'ziemia [+10]', color: 'orange_red' },
  'zoltawobrazowych monacytow': { effect: 'ziemia [+10]', color: 'orange_red' },
  'lilioworozowy spinel': { effect: 'R ziemia [+20]', color: 'orange_red' },
  'lilioworozowe spinele': { effect: 'R ziemia [+20]', color: 'orange_red' },
  'lilioworozowych spineli': { effect: 'R ziemia [+20]', color: 'orange_red' },
  'bezbarwny gorski krysztal': { effect: 'ziemia [+10]', color: 'orange_red' },
  'bezbarwne gorskie krysztaly': { effect: 'ziemia [+10]', color: 'orange_red' },
  'bezbarwnych gorskich krysztalow': { effect: 'ziemia [+10]', color: 'orange_red' },
  'brazowy tytanit': { effect: 'R ziemia [+30]', color: 'orange_red' },
  'brazowe tytanity': { effect: 'R ziemia [+30]', color: 'orange_red' },
  'brazowych tytanitow': { effect: 'R ziemia [+30]', color: 'orange_red' },
  'szary obsydian': { effect: 'ziemia [+10]', color: 'orange_red' },
  'szare obsydiany': { effect: 'ziemia [+10]', color: 'orange_red' },
  'szarych obsydianow': { effect: 'ziemia [+10]', color: 'orange_red' },
  'brazowy kwarc': { effect: 'ziemia [+10]', color: 'orange_red' },
  'brazowe kwarce': { effect: 'ziemia [+10]', color: 'orange_red' },
  'brazowych kwarcow': { effect: 'ziemia [+30]', color: 'orange_red' },
  // Zimno
  'niebieski turkus': { effect: 'zimno [+10]', color: 'ansi_cyan' },
  'niebieskie turkusy': { effect: 'zimno [+10]', color: 'ansi_cyan' },
  'niebieskich turkusow': { effect: 'zimno [+10]', color: 'ansi_cyan' },
  'niebieskawy zoisyt': { effect: 'R zimno [+20]', color: 'ansi_cyan' },
  'niebieskawe zoisyty': { effect: 'R zimno [+20]', color: 'ansi_cyan' },
  'niebieskawych zoisytow': { effect: 'R zimno [+20]', color: 'ansi_cyan' },
  'blekitny almandyn': { effect: 'R zimno [+20]', color: 'ansi_cyan' },
  'blekitne almandyny': { effect: 'R zimno [+20]', color: 'ansi_cyan' },
  'blekitnych almandynow': { effect: 'R zimno [+20]', color: 'ansi_cyan' },
  // Magia zycia
  'jasnozloty heliodor': { effect: 'R magia zycia [+30]', color: 'GhostWhite' },
  'jasnozlote heliodory': { effect: 'R magia zycia [+30]', color: 'GhostWhite' },
  'jasnozlotych heliodorow': { effect: 'R magia zycia [+30]', color: 'GhostWhite' },
  'zolty cyrkon': { effect: 'R magia zycia [+20]', color: 'GhostWhite' },
  'zolte cyrkony': { effect: 'R magia zycia [+20]', color: 'GhostWhite' },
  'zoltych cyrkonow': { effect: 'R magia zycia [+20]', color: 'GhostWhite' },
  'zolty celestyn': { effect: 'magia zycia [+10]', color: 'GhostWhite' },
  'zolte celestyny': { effect: 'magia zycia [+10]', color: 'GhostWhite' },
  'zoltych celestynow': { effect: 'magia zycia [+10]', color: 'GhostWhite' },
  'zoltawobrazowy bursztyn': { effect: 'magia zycia [+10]', color: 'GhostWhite' },
  'zoltawobrazowe bursztyny': { effect: 'magia zycia [+10]', color: 'GhostWhite' },
  'zoltawobrazowych bursztynow': { effect: 'magia zycia [+10]', color: 'GhostWhite' },
  'rozowy rodochrozyt': { effect: 'R magia zycia [+30]', color: 'GhostWhite' },
  'rozowe rodochrozyty': { effect: 'R magia zycia [+30]', color: 'GhostWhite' },
  'rozowych rodochrozytow': { effect: 'R magia zycia [+30]', color: 'GhostWhite' },
  'jaskrawozolty cytryn': { effect: 'magia zycia [+20]', color: 'GhostWhite' },
  'jaskrawozolte cytryny': { effect: 'magia zycia [+20]', color: 'GhostWhite' },
  'jaskrawozoltych cytrynow': { effect: 'magia zycia [+20]', color: 'GhostWhite' },
};

export function colorToHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    ansi_magenta: '#ff00ff',
    ansiLightYellow: '#ffff00',
    LawnGreen: '#7cfc00',
    DarkSlateGray: '#2f4f4f',
    ansi_light_cyan: '#00ffff',
    red: '#ff0000',
    LightGoldenrod: '#fafad2',
    dodger_blue: '#1e90ff',
    orange_red: '#ff4500',
    ansi_cyan: '#00ffff',
    GhostWhite: '#f8f8ff',
  };
  return colorMap[colorName] || '#ffffff';
}

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

export function setupStones(api: PluginApi): () => void {
  const tag = 'ra:stones';

  for (const [name, info] of Object.entries(STONES)) {
    const hex = colorToHex(info.color);
    api.triggers.register(
      new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      (line, matches) => {
        const matchText = matches?.[0] || name;
        const idx = line.text.indexOf(matchText);
        if (idx === -1) return line;
        const effectText = ` (${info.effect})`;
        const effectColor = api.colors.fromHex(hex);
        const greyColor = api.colors.fromHex('#555555');
        line.color([idx, idx + matchText.length], greyColor);
        line.append(effectText, effectColor);
        return line;
      },
      tag
    );
  }

  api.aliases.register(/^\/baza_kamieni$/, () => {
    cecho(api, '\n\t<yellow>Dostepne informacje o kamieniach i ich wlasciwosciach:\n\n');
    const seen = new Set<string>();
    for (const [name, info] of Object.entries(STONES)) {
      const key = info.effect + info.color;
      if (seen.has(key)) continue;
      seen.add(key);
      cecho(api, ` <MediumSeaGreen> - ${name} <${info.color}>${info.effect}\n`);
    }
    cecho(api, '\n');
    return true;
  });

  return () => {
    api.triggers.removeByTag(tag);
  };
}
