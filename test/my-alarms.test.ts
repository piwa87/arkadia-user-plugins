import { describe, expect, it } from 'vitest';
import { init } from '../src/plugins/my-alarms-plugin';
import { createMockApi, createMockLine, MockAnsiAwareBuffer } from './helpers/mockApi';

describe('my-alarms plugin', () => {
  it('highlights trap tile line and prints PULAPKA warning', async () => {
    const { api, triggers } = createMockApi();
    await init(api);

    const text = 'Jedna z nich jest jednak lekko wcisnieta, wyraznie odznaczajac sie od pozostalych.';
    const t = triggers.find((tr) => (tr.pattern as RegExp).test(text));
    expect(t).toBeDefined();
    expect(t!.tag).toBe('myAlarms');

    const line = createMockLine(text);
    t!.callback(line, [] as unknown as RegExpMatchArray);

    const printed = (api.output.print as any).mock.calls[0]?.[0];
    expect(printed instanceof MockAnsiAwareBuffer).toBe(true);
    expect((printed as MockAnsiAwareBuffer).text).toContain('PULAPKA');
    expect(line.color).toHaveBeenCalledWith([0, text.length], expect.any(Object));
  });

  it.each([
    [
      'Szubienicznik',
      'Widzisz dlugi sarkofag pozbawiony jakichkolwiek ozdob, procz rzezby w ksztalcie czterech falistych sztyletow skierowanych ku sobie rekojesciami. W srodku gwiazdy cos tam',
    ],
    [
      'Utopiec',
      'Sarkofag wykonany jest z czarnego kamienia, jego wieko zdobione jest ornamentami z srebrzystego metalu. Po srodku umieszczono wizerunek pieknej kobiety pochylajacej sie nad woda. cos',
    ],
    [
      'Kosciotrup',
      'Na wieku wykuto plaskorzezbe przedstawiajaca rycerza o srogim spojrzeniu. Dlonie groznego wojownika spoczywaja na rekojesci wielkiego miecza o falistym ostrzu. Na napiersniku postaci lsni sie czarna gwiazda. Ciezkie wieko przykrywa sarkofag.',
    ],
    [
      'Struchlec',
      'Widzisz solidny sarkofag wykonany z czarnego marmuru poznaczonego jadeitowa inkrustacja. Zielone wzory krzyzuja sie i okrazaja w wielu miejscach, tworzac intrygujace szlaki. cos',
    ],
  ])('identifies undead coffin type: %s', async (name, text) => {
    const { api, triggers } = createMockApi();
    await init(api);

    const t = triggers.find((tr) => (tr.pattern as RegExp).test(text));
    expect(t).toBeDefined();

    const line = createMockLine(text);
    t!.callback(line, [] as unknown as RegExpMatchArray);

    const printed = (api.output.print as any).mock.calls[0]?.[0];
    expect(printed instanceof MockAnsiAwareBuffer).toBe(true);
    expect((printed as MockAnsiAwareBuffer).text).toContain(name);
    expect(line.color).toHaveBeenCalledWith([0, text.length], expect.any(Object));
  });

  it('highlights poison line and prints trucizna warning', async () => {
    const { api, triggers } = createMockApi();
    await init(api);

    const text = 'Czujesz, ze do twego ciala dostaje sie trucizna.';
    const t = triggers.find((tr) => (tr.pattern as RegExp).test(text));
    expect(t).toBeDefined();

    const line = createMockLine(text);
    t!.callback(line, [] as unknown as RegExpMatchArray);

    const printed = (api.output.print as any).mock.calls[0]?.[0];
    expect(printed instanceof MockAnsiAwareBuffer).toBe(true);
    expect((printed as MockAnsiAwareBuffer).text).toContain('trucizna');
    expect(line.color).toHaveBeenCalledWith([0, text.length], expect.any(Object));
  });

  it('substitutes eating warning with a green OK response', async () => {
    const { api, triggers } = createMockApi();
    await init(api);

    const text = 'Nie dasz rady tego juz zjesc';
    const t = triggers.find((tr) => (tr.pattern as RegExp).test(text));
    expect(t).toBeDefined();

    const line = createMockLine(text);
    const result = t!.callback(line, [] as unknown as RegExpMatchArray);

    expect(result).toBe(line);
    expect(line.replace).toHaveBeenCalledWith([0, text.length], '--> Jedzenie OK');
    expect(line.color).toHaveBeenCalledWith([13, 15], 4);
    expect(line.text).toBe('--> Jedzenie OK');
  });

  it('plays sound and flees when sarcophagus closes', async () => {
    const { api, triggers } = createMockApi();
    await init(api);

    const text = 'Kamienna plyta sarkofagu z glosnym zgrzytem zostaje zasunieta';
    const t = triggers.find((tr) => (tr.pattern as RegExp).test(text));
    expect(t).toBeDefined();

    const line = createMockLine(text);
    t!.callback(line, [] as unknown as RegExpMatchArray);

    expect(api.command.send).toHaveBeenCalledWith('play_basso');
    expect(api.command.send).toHaveBeenCalledWith('f+ osa');
    expect(api.output.print).not.toHaveBeenCalled();
  });
});
