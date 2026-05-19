import type { PluginApi } from '@arkadia/plugin-types';
import { colorToHex } from './stones';

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

export function setupCmentarzCampo(api: PluginApi): () => void {
  const tag = 'ra:cmentarz-campo';
  const goldColor = api.colors.fromHex(colorToHex('gold'));
  const redColor = api.colors.fromHex(colorToHex('red'));

  api.triggers.register(
    /Sarkofag wykonany jest z czarnego/,
    (line) => {
      line.append(' (Utopiec)', goldColor);
      api.bind.set(null, () => {
        api.command.send('zamknij sarkofag');
        api.command.send('otworz sarkofag');
      });
      return line;
    },
    tag
  );

  api.triggers.register(
    /Widzisz dlugi sarkofag pozbawiony/,
    (line) => {
      line.append(' (Szubienicznik)', goldColor);
      api.bind.set(null, () => {
        api.command.send('zamknij sarkofag');
        api.command.send('otworz sarkofag');
      });
      return line;
    },
    tag
  );

  api.triggers.register(
    /Widzisz solidny sarkofag wykonany/,
    (line) => {
      line.append(' (Struchlec)', goldColor);
      api.bind.set(null, () => {
        api.command.send('zamknij sarkofag');
        api.command.send('otworz sarkofag');
      });
      return line;
    },
    tag
  );

  api.triggers.register(
    /Widzisz surowy, prosty sarkofag/,
    (line) => {
      line.append(' (Kosciotrup)', goldColor);
      api.bind.set(null, () => {
        api.command.send('zamknij sarkofag');
        api.command.send('otworz sarkofag');
      });
      return line;
    },
    tag
  );

  api.triggers.register(
    /Sarkofag jest duzy i bogato zdobiony. Na jego scianach widac zdobienia/,
    (line) => {
      line.append(' (TRAD)', redColor);
      api.bind.set('przeszukaj weza');
      return line;
    },
    tag
  );

  api.triggers.register(
    /lewy kiel weza, polozony od wewnetrznej strony rzezby, jest sprytnie ukrytym przelacznikiem/,
    (line) => {
      line.append(' (Przelacznik)', goldColor);
      api.bind.set('przelacz przelacznik');
      return line;
    },
    tag
  );

  api.triggers.register(
    /jezyk weza jest sprytnie ukryta dzwigienka/,
    (line) => {
      line.append(' (Dzwigienka)', goldColor);
      api.bind.set('przelacz dzwigienke');
      return line;
    },
    tag
  );

  api.triggers.register(
    /lewe oko weza, umieszczone od strony grobowca, jest sprytnie ukrytym przyciskiem/,
    (line) => {
      line.append(' (Przycisk)', goldColor);
      api.bind.set('wcisnij przycisk');
      return line;
    },
    tag
  );

  api.triggers.register(
    /koniec ogona to sprytnie ukryte pokretlo/,
    (line) => {
      line.append(' (Pokretlo)', goldColor);
      api.bind.set('przekrec pokretlo');
      return line;
    },
    tag
  );

  api.triggers.register(
    /Wyglada na to ze udalo ci sie odbezpieczyc wieko sarkofagu!/,
    (line) => {
      api.bind.set(null, () => {
        api.command.send('otworz sarkofag');
        api.command.send('wez wszystko z sarkofagu');
      });
      return line;
    },
    tag
  );

  api.triggers.register(
    /(szubienicznik|utopiec|kosciotrup|struchlec).* wylazi z sarkofagu/,
    (line) => {
      cecho(api, "\n<red>Nieumarly wylazi z sarkofagu!\n");
      api.bind.set('zabij nieumarlego');
      return line;
    },
    tag
  );

  api.triggers.register(
    /Spod ziemi pod progiem komnaty wylania sie przerazliwa postac!/,
    (line) => {
      cecho(api, "\n<red>Nieumarly wylazi z sarkofagu!\n");
      api.bind.set('zabij nieumarlego');
      return line;
    },
    tag
  );

  api.triggers.register(
    /^[ >]*Kamienna plyta z przerazliwym zgrzytem zamyka wejscie do grobowca!/,
    (line) => {
      api.bind.set('przesun plyte');
      return line;
    },
    tag
  );

  return () => {
    api.triggers.removeByTag(tag);
  };
}
