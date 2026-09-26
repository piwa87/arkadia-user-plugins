import { describe, expect, it } from 'vitest';
import { setupColCialo } from '../../../src/plugins/core-plugin/colors/col_cialo';
import { setupCiosyKolory } from '../../../src/plugins/core-plugin/colors/col_ciosy';
import { setupColEkwipunek } from '../../../src/plugins/core-plugin/colors/col_ekwipunek';
import { setupColMovements } from '../../../src/plugins/core-plugin/colors/col_movements';
import { setupMiscTriggers } from '../../../src/plugins/core-plugin/triggers/misc';
import { setupZlecenia } from '../../../src/plugins/development-plugin/zlecenia';
import { createMockApi, runLine } from '../../helpers/mockApi';

describe('token-gated small trigger modules', () => {
  it('col_cialo colors corpse segments', () => {
    const mock = createMockApi();
    setupColCialo(mock.api);
    const line = runLine(mock, 'Widzisz cialo martwego szczura na ziemi.');
    expect(line!.color).toHaveBeenCalledWith([8, 33], expect.anything());
  });

  it('col_ciosy colors my hits and hits from others differently', () => {
    const mock = createMockApi();
    setupCiosyKolory(mock.api);

    const mine = runLine(mock, 'Z latwoscia masakrujesz szczura.');
    expect(mine!.color).toHaveBeenCalledWith([12, 23], expect.anything());

    const theirs = runLine(mock, 'Wielki szczur lekko rani cie w noge.');
    expect(theirs!.color).toHaveBeenCalledWith([14, 28], expect.anything());
  });

  it('col_ekwipunek rewrites the wkladanie line', () => {
    const mock = createMockApi();
    setupColEkwipunek(mock.api);
    const line = runLine(mock, 'Wkladasz zloty pierscien do sakwy.');
    expect(line!.text).toBe('-->  zloty pierscien  |  sakwy');
  });

  it('col_movements marks completed, pending, and failed mountain movement', () => {
    const mock = createMockApi();
    setupColMovements(mock.api);

    const completed = runLine(mock, 'Docierasz na gore.');
    expect(completed!.text.startsWith('   OK   ')).toBe(true);
    expect(completed!.color).toHaveBeenCalledWith(
      [0, 'Docierasz na gore.'.length],
      expect.objectContaining({ value: '#a6a6a6' }),
    );

    const pending = runLine(mock, 'Zaczynasz wspinac sie na gore.');
    expect(pending!.text.startsWith('   ...   ')).toBe(true);
    expect(pending!.color).toHaveBeenCalledWith(
      [0, 'Zaczynasz wspinac sie na gore.'.length],
      expect.objectContaining({ value: '#a6a6a6' }),
    );

    const failed = runLine(
      mock,
      'Odpadasz od sciany i lecisz w dol, jednak dzieki niewielkiej wysokosci udaje ci sie zgrabnie wyladowac na ziemi.',
    );
    expect(failed!.text.startsWith('   ZLE   ')).toBe(true);
    expect(failed!.color).toHaveBeenCalledWith(
      [0, 'Odpadasz od sciany i lecisz w dol, jednak dzieki niewielkiej wysokosci udaje ci sie zgrabnie wyladowac na ziemi.'.length],
      expect.objectContaining({ value: '#a6a6a6' }),
    );
  });

  it('misc dobywa line is spaced out', () => {
    const mock = createMockApi();
    setupMiscTriggers(mock.api);
    const line = runLine(mock, 'Wielki ork dobywa miecza.');
    expect(line!.text).toBe('Wielki ork    d o b y w a    miecza.');
  });

  it('misc podawanie prints alert but ignores reflexive sie', () => {
    const mock = createMockApi();
    setupMiscTriggers(mock.api);
    runLine(mock, 'Stary handlarz daje ci mieszek pelen monet.');
    expect((mock.api.output.print as any).mock.calls.length).toBe(1);

    runLine(mock, 'Wielki ork daje sie podejsc od tylu.');
    expect((mock.api.output.print as any).mock.calls.length).toBe(1);
  });

  it('zlecenia auto-requests /zlecenia on seller line', () => {
    const mock = createMockApi();
    setupZlecenia(mock.api);
    runLine(mock, 'Kowal mowi do ciebie: Na realizacje zamowienia mam okolo godziny.');
    expect(mock.api.command.send).toHaveBeenCalledWith('/zlecenia');
  });
});
