import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';

export async function init(api: PluginApi): Promise<PluginInfo> {
  const tag = 'myAlarms';

  // ── colors ────────────────────────────────────────────────────────────────

  const cyanColor = api.colors.fromHex('#22d3ee'); // trap tile
  const dangerColor = api.colors.fromHex('#ef4444'); // poison
  const undeadColor = api.colors.fromHex('#a78bfa'); // undead type lines
  const alertColor = api.colors.fromHex('#fbbf24'); // printed alert text

  // ── helpers ───────────────────────────────────────────────────────────────

  const colorLine = (line: any, color: any) => line.color([0, line.text.length], color);

  const printAlert = (text: string, color: any) => {
    const buf = new api.AnsiAwareBuffer(text);
    buf.color([0, text.length], color);
    api.output.print(buf);
  };

  // ── triggers ──────────────────────────────────────────────────────────────

  // Trap tile (blekitni_plyta)
  api.triggers.register(
    /Jedna z nich jest jednak lekko wcisnieta, wyraznie odznaczajac sie od pozostalych\./,
    (line) => {
      printAlert('⚠  PULAPKA - PLYTA!', alertColor);
      return colorLine(line, cyanColor);
    },
    tag,
  );

  // Undead coffin type: Szubienicznik
  api.triggers.register(
    /Widzisz dlugi sarkofag pozbawiony jakichkolwiek ozdob, procz rzezby w ksztalcie czterech falistych sztyletow skierowanych ku sobie rekojesciami\. W srodku gwiazdy .*/,
    (line) => {
      printAlert('     Szubienicznik!', undeadColor);
      return colorLine(line, undeadColor);
    },
    tag,
  );

  // Undead coffin type: Utopiec
  api.triggers.register(
    /Sarkofag wykonany jest z czarnego kamienia, jego wieko zdobione jest ornamentami z srebrzystego metalu\. Po srodku umieszczono wizerunek pieknej kobiety pochylajacej sie nad woda\..*/,
    (line) => {
      printAlert('     Utopiec!', undeadColor);
      return colorLine(line, undeadColor);
    },
    tag,
  );

  // Undead coffin type: Kosciotrup
  api.triggers.register(
    /Na wieku wykuto plaskorzezbe przedstawiajaca rycerza o srogim spojrzeniu\. Dlonie groznego wojownika spoczywaja na rekojesci wielkiego miecza o falistym ostrzu\. Na napiersniku postaci lsni sie czarna gwiazda\. Ciezkie wieko przykrywa sarkofag\./,
    (line) => {
      printAlert('     Kosciotrup!', undeadColor);
      return colorLine(line, undeadColor);
    },
    tag,
  );

  // Undead coffin type: Struchlec
  api.triggers.register(
    /Widzisz solidny sarkofag wykonany z czarnego marmuru poznaczonego jadeitowa inkrustacja\. Zielone wzory krzyzuja sie i okrazaja w wielu miejscach, tworzac intrygujace szlaki\..*/,
    (line) => {
      printAlert('     Struchlec!', undeadColor);
      return colorLine(line, undeadColor);
    },
    tag,
  );

  // Poison (wyv_trutka_on)
  api.triggers.register(
    /Czujesz, ze do twego ciala d.* truciz.*/,
    (line) => {
      printAlert('[ trucizna ]', dangerColor);
      return colorLine(line, dangerColor);
    },
    tag,
  );

  // Eating limit warning
  api.triggers.register(
    /^(Nie sadzisz, zebys .* w stanie zjesc tyle|Nie dasz rady tego juz zjesc)\.?$/,
    (line) => {
      line.replace([0, line.text.length], '--> Jedzenie OK');
      line.color([13, 15], 4);
      return line;
    },
    tag,
  );

  // Sarcophagus closed — play sound + flee
  api.triggers.register(
    /^Kamienna plyta sarkofagu z glosnym zgrzytem zostaje zasunieta/,
    (line) => {
      api.command.send('play_basso');
      api.command.send('f+ osa');
      return line;
    },
    tag,
  );

  return {
    name: 'My Alarms',
    version: '0.1.0',
    description: 'Visual and audio alerts for traps, undead types, and status effects',
  };
}
