import { describe, expect, it } from 'vitest';
import { odgadnijZiarno } from '../../../src/plugins/rkg-plugin/legacy-seed';

describe('old club seed suggestion', () => {
  it('recovers the Kalafior example', () => {
    expect(odgadnijZiarno('Spolka Handlowa Smetnego Kalafiora')).toEqual({
      typ: 'spolka handlowa',
      przymiotnik: 'smetny',
      rzeczownik: 'kalafior',
      liczba: 'pojedynczej',
      przypadek: 'dopelniaczu',
    });
  });

  it('leaves a name with an unknown adjective for manual review', () => {
    expect(odgadnijZiarno('Kompania Kupiecka Tarcza')).toBeNull();
  });
});
