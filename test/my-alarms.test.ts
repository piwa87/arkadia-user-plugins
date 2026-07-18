import { describe, expect, it } from 'vitest';
import { setupEventTriggers } from '../src/plugins/core-plugin/triggers/events';
import { createMockApi, MockAnsiAwareBuffer, runLine } from './helpers/mockApi';

function setup() {
  const mock = createMockApi();
  setupEventTriggers(mock.api);
  return mock;
}

function printedBuffers(mock: ReturnType<typeof createMockApi>): MockAnsiAwareBuffer[] {
  return (mock.api.output.print as any).mock.calls
    .map(([arg]: [unknown]) => arg)
    .filter((arg: unknown): arg is MockAnsiAwareBuffer => arg instanceof MockAnsiAwareBuffer);
}

describe('core-plugin event triggers', () => {
  it('highlights trap tile line and prints PULAPKA warning', async () => {
    const mock = setup();
    const text = 'Jedna z nich jest jednak lekko wcisnieta, wyraznie odznaczajac sie od pozostalych.';
    const line = runLine(mock, text);

    expect(printedBuffers(mock).some((b) => b.text.includes('PULAPKA'))).toBe(true);
    expect(line!.color).toHaveBeenCalledWith([0, text.length], expect.any(Object));
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
    const mock = setup();
    const line = runLine(mock, text);

    expect(printedBuffers(mock).some((b) => b.text.includes(name))).toBe(true);
    expect(line!.color).toHaveBeenCalledWith([0, text.length], expect.any(Object));
  });

  it('highlights poison line and prints trucizna warning', async () => {
    const mock = setup();
    const text = 'Czujesz, ze do twego ciala dostaje sie trucizna.';
    const line = runLine(mock, text);

    expect(printedBuffers(mock).some((b) => b.text.includes('trucizna'))).toBe(true);
    expect(line!.color).toHaveBeenCalledWith([0, text.length], expect.any(Object));
  });

  it('substitutes eating warning with a green OK response', async () => {
    const mock = setup();
    const text = 'Nie dasz rady tego juz zjesc';
    const line = runLine(mock, text);

    expect(line!.replace).toHaveBeenCalledWith([0, text.length], '--> Jedzenie OK');
    expect(line!.color).toHaveBeenCalledWith([13, 15], { type: 'hex', value: '#00aa04' });
    expect(line!.text).toBe('--> Jedzenie OK');
  });

  it('substitutes drinking warning with a green OK response', async () => {
    const mock = setup();
    const text = 'Wypiles juz tak duzo, ze nie jestes w stanie wmusic w siebie wiecej.';
    const line = runLine(mock, text);

    expect(line!.text).toBe('--> Picie OK');
  });

  it('plays sound and flees when sarcophagus closes', async () => {
    const mock = setup();
    runLine(mock, 'Kamienna plyta sarkofagu z glosnym zgrzytem zostaje zasunieta');

    expect(mock.api.command.send).toHaveBeenCalledWith('play_basso');
    expect(mock.api.command.send).toHaveBeenCalledWith('f+ osa');
    expect(printedBuffers(mock)).toHaveLength(0);
  });

  it('leaves unrelated lines untouched', async () => {
    const mock = setup();
    const line = runLine(mock, 'Widzisz przed soba zwykly kamienny korytarz.');
    expect(line!.text).toBe('Widzisz przed soba zwykly kamienny korytarz.');
    expect(line!.color).not.toHaveBeenCalled();
  });
});
