import type { PluginApi } from '@arkadia/plugin-types';
import { colorToHex } from './stones';

export function setupHints(api: PluginApi): () => void {
  const tag = 'ra:hints';
  const yellowColor = api.colors.fromHex(colorToHex('yellow'));
  const greenColor = api.colors.fromHex(colorToHex('ansi_light_green'));
  const purpleColor = api.colors.fromHex(colorToHex('purple'));
  const cyanColor = api.colors.fromHex(colorToHex('cyan'));
  const slateBlueColor = api.colors.fromHex(colorToHex('slate_blue'));

  api.triggers.register(
    /^Zakladasz luskowy czerwonawy kaftan\.$/,
    (line) => {
      line.append(' (podpal mnie)', yellowColor);
      return line;
    },
    tag,
  );

  api.triggers.register(
    /^(Na twoich palcach osadza sie odrobina mlecznobialego pylu\.)$/,
    (line, matches) => {
      if (matches?.[1]) {
        line.colorWords(matches[1], slateBlueColor);
      }
      return line;
    },
    tag,
  );

  api.triggers.register(
    /waski zebaty palasz/,
    (line) => {
      line.colorWords('waski zebaty palasz', greenColor);
      line.append(' (Uwaga! Trujacy!)', greenColor);
      return line;
    },
    tag,
  );

  api.triggers.register(
    /dlugi krwisty sztylet/,
    (line) => {
      line.colorWords('dlugi krwisty sztylet', greenColor);
      line.append(' (Uwaga! Trujacy!)', greenColor);
      return line;
    },
    tag,
  );

  api.triggers.register(
    /srebrna broszka/,
    (line) => {
      line.colorWords('srebrna broszka', purpleColor);
      return line;
    },
    tag,
  );

  api.triggers.register(
    /zary (stojacy|pedzacy) dylizans/,
    (line) => {
      line.append(' (Varieno)');
      return line;
    },
    tag,
  );

  api.triggers.register(
    /tary (stojacy|pedzacy) dylizans/,
    (line) => {
      line.append(' (Toskania)');
      return line;
    },
    tag,
  );

  api.triggers.register(
    /(.*) daje ci azurowy koscistobialy amulet\.$/,
    (line) => {
      api.bind.set(
        null,
        () => {
          api.command.send('zdejmij zalozony naszyjnik');
          api.command.send('zaloz azurowy koscistobialy amulet');
        },
        true,
      );
      return line;
    },
    tag,
  );

  api.triggers.register(
    /(W plytkim zaglebieniu ziemi zauwazasz szeroka szczeline\.)/,
    (line, matches) => {
      if (matches?.[1]) {
        line.colorWords(matches[1], cyanColor);
      }
      return line;
    },
    tag,
  );

  return () => {
    api.triggers.removeByTag(tag);
  };
}
