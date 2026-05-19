import type { PluginApi } from '@arkadia/plugin-types';

export async function init(api: PluginApi): Promise<void> {
  api.triggers.register(
    /Jedna z nich jest jednak lekko wcisnieta, wyraznie odznaczajac sie od pozostalych\./,
    (line) => {
      api.output.print(new api.AnsiAwareBuffer('⚠️  PULAPKA'));
      line.color([0, line.text.length], { type: 'hex', value: '#ff0000' });
      return line;
    },
    'myAlarms'
  );

  api.triggers.register(
    /Widzisz dlugi sarkofag pozbawiony jakichkolwiek ozdob.*czterech falistych sztyletow/,
    (line) => {
      api.output.print(new api.AnsiAwareBuffer('Szubienicznik'));
      line.color([0, line.text.length], { type: 'hex', value: '#ffaa00' });
      return line;
    },
    'myAlarms'
  );

  api.triggers.register(
    /Sarkofag wykonany jest z czarnego kamienia.*srebrzystego metalu.*kobiet/,
    (line) => {
      api.output.print(new api.AnsiAwareBuffer('Utopiec'));
      line.color([0, line.text.length], { type: 'hex', value: '#ffaa00' });
      return line;
    },
    'myAlarms'
  );

  api.triggers.register(
    /Na wieku wykuto plaskorzezbe.*rycerza o srogim spojrzeniu.*miecza o falistym ostrzu/,
    (line) => {
      api.output.print(new api.AnsiAwareBuffer('Kosciotrup'));
      line.color([0, line.text.length], { type: 'hex', value: '#ffaa00' });
      return line;
    },
    'myAlarms'
  );

  api.triggers.register(
    /Widzisz solidny sarkofag wykonany z czarnego marmuru.*jadeitowa inkrustacja/,
    (line) => {
      api.output.print(new api.AnsiAwareBuffer('Struchlec'));
      line.color([0, line.text.length], { type: 'hex', value: '#ffaa00' });
      return line;
    },
    'myAlarms'
  );

  api.triggers.register(
    /Czujesz, ze do twego ciala dostaje sie trucizna\./,
    (line) => {
      api.output.print(new api.AnsiAwareBuffer('⚠️  trucizna'));
      line.color([0, line.text.length], { type: 'hex', value: '#ff0000' });
      return line;
    },
    'myAlarms'
  );

  api.triggers.register(
    /Nie dasz rady tego juz zjesc/,
    (line) => {
      line.replace([0, line.text.length], '--> Jedzenie OK');
      line.color([13, 15], 4);
      return line;
    },
    'myAlarms'
  );

  api.triggers.register(
    /Kamienna plyta sarkofagu z glosnym zgrzytem zostaje zasunieta/,
    (line) => {
      api.command.send('play_basso');
      api.command.send('f+ osa');
      return line;
    },
    'myAlarms'
  );
}
