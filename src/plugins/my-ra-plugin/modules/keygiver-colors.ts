import type { PluginApi } from '@arkadia/plugin-types';
import { colorToHex } from './stones';
import { createDedupedBind } from './bind-utils';

const KEYGIVER_NPCS: RegExp[] = [
  /([Bb]ystry zakapturzony skaven)/,
  /([Rr]osly brazowooki mezczyzna)/,
  /([Ww]ysoki bezwzgledny czarny ork)/,
  /([Zz]ylasty zimnooki mezczyzna)/,
  /([Nn]iespokojny blady gnom)/,
  /([Ww]ysoki zarosniety mezczyzna)/,
  /([Ss]urowy szpakowaty mezczyzna)/,
  /([Ss]niady wystrojony mezczyzna)/,
  /([Ss]zmaragdowooka wychudzona kobieta)/,
  /([Ss]olidna rybacka lodz)/,
  /([Mm]igdalowooka wiotka polelfka)/,
  /([Zz]akapturzony zgarbiony mezczyzna)/,
  /([Cc]zarnowlosy wyniosly mezczyzna)/,
  /([Ss]zkaradny przygarbiony mezczyzna)/,
  /([Cc]zujny mlody mezczyzna)/,
  /([Mm]loda jasnowlosa dziewczyna)/,
  /([Zz]wrotna nieduza fusta)/,
  /([Pp]onury stary szkuner)/,
  /([Ww]ysoki zakrwawiony halfling)/,
  /([Nn]ietoperzowy plaskonosy potwor)/,
  /([Kk]rzepki opalony mezczyzna)/,
  /([Cc]zarnowlosy grozny mezczyzna)/,
  /([Nn]iebieskooki potezny mezczyzna)/,
  /([Ww]szawy jednooki mezczyzna)/,
  /([Ss]rogi raptawy mezczyzna)/,
  /([Oo]bladowany niestrudzony mezczyzna)/,
  /([Zz]enner)/,
  /([Ss]tary kamienny troll)/,
  /([Ss]zarozielony zwalisty troll)/,
  /([Pp]odstarzaly zwawy krasnolud)/,
  /([Pp]rzerosniety wielkostopy troll gorski)/,
  /([Mm]ocarny czarnobrody ogr)/,
  /([Ww]ychudzona szmaragdowooka kobieta)/,
  /(Khelor)/,
  /([Rr]osly blekitnooki mezczyzna)/,
  /(Darrepin)/,
  /([Jj]asnowlosy cnotliwy mezczyzna)/,
  /([Pp]arszywy silvan)/,
  /([Ss]rebrnobrody rogaty faun)/,
  /([Ss]inozielony przygarbiony troll)/,
  /([Zz]masakrowane zwloki czlowieka)/,
  /([Bb]ezwzgledny zakapturzony mezczyzna)/,
  /([Ww]ielki ponury mezczyzna)/,
];

export function setupKeygiverColors(api: PluginApi): () => void {
  const tag = 'ra:keygiver-colors';
  const dedupedBind = createDedupedBind(api);
  const purpleColor = api.colors.fromHex(colorToHex('purple'));

  for (const pattern of KEYGIVER_NPCS) {
    api.triggers.register(
      pattern,
      (line, matches) => {
        if (!matches?.[1]) return line;
        line.colorWords(matches[1], purpleColor);
        line.append(' (klucz)', purpleColor);
        return line;
      },
      tag,
    );
  }

  api.triggers.register(
    /([Mm]uskularny olbrzymi czarny ork)/,
    (line, matches) => {
      if (!matches?.[1]) return line;
      const room = api.map.getRoom();
      if (room?.area === 'Masyw Orcal') {
        line.colorWords(matches[1], purpleColor);
        line.append(' (klucz)', purpleColor);
      }
      return line;
    },
    tag,
  );

  api.triggers.register(
    /([Ss]iwobrody dostojny mezczyzna)/,
    (line, matches) => {
      if (!matches?.[1]) return line;
      line.colorWords(matches[1], purpleColor);
      line.append(' (zapytaj o miejsca mocy!)', purpleColor);
      return line;
    },
    tag,
  );

  api.triggers.register(
    /(Jorn)/,
    (line, matches) => {
      if (!matches?.[1]) return line;
      line.colorWords(matches[1], purpleColor);
      line.append(' (zapytaj o miejsca mocy!)', purpleColor);
      return line;
    },
    tag,
  );

  api.triggers.register(
    /Benicjo\./,
    (line) => {
      dedupedBind.set('zapytaj benicja o obecnych', undefined, true);
      return line;
    },
    tag,
  );

  return () => {
    api.triggers.removeByTag(tag);
    dedupedBind.cleanup();
  };
}
