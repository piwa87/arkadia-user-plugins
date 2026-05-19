import type { PluginApi } from '@arkadia/plugin-types';
import { colorToHex } from './stones';

export function setupSwiatynia(api: PluginApi): () => void {
  const tag = 'ra:swiatynia';
  const cyanColor = api.colors.fromHex(colorToHex('cyan'));

  api.triggers.register(
    /Z wnetrza trojtwarzowej glowy posagu dochodzi krotki zgrzyt, jakby wewnatrz pracowal jakis mechanizm\./,
    (line) => {
      api.output.print('\n <orange>zmiana w ktorejs z twarzy\n');
      api.bind.set(null, () => {
        api.command.send('ob twarz chlopca');
        api.command.send('ob twarz mezczyzny');
        api.command.send('ob twarz starca');
      });
      return line;
    },
    tag,
  );

  api.triggers.register(
    /To chyba optymalne polozenie zaworow wewnatrz glowy posagu\./,
    (line) => {
      api.output.print('\n\n <YellowGreen>szeroki strumien, krzyknij, ze jest ok\n');
      return line;
    },
    tag,
  );

  api.triggers.register(
    /dosc zwawy strumien wody/,
    (line) => {
      line.colorWords('dosc zwawy strumien wody', cyanColor);
      return line;
    },
    tag,
  );

  api.triggers.register(
    /kapie kropla wody/,
    (line) => {
      line.colorWords('kapie kropla wody', cyanColor);
      return line;
    },
    tag,
  );

  api.triggers.register(
    /cieniutki strumyczek wody/,
    (line) => {
      line.colorWords('cieniutki strumyczek wody', cyanColor);
      return line;
    },
    tag,
  );

  api.triggers.register(
    /wylatuje cos metalowego i szybko spada na dol i z pluskiem wpada do dolnego zbiornika fontanny!/,
    (line) => {
      api.output.print('\n\n <YellowGreen>klucz wpadl do misy\n');
      return line;
    },
    tag,
  );

  return () => {
    api.triggers.removeByTag(tag);
  };
}
