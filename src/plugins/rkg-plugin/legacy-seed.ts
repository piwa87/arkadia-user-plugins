import type { Ziarno } from '../../shared/rkg-api';
import { pasujeRdzen, rdzen } from '../../shared/rkg-grammar';
import { RKG_PRZYMIOTNIKI } from './data/adjectives';
import { RZECZOWNIKI_SEED } from './data/seed';
import { RKG_TYPY } from './data/types';

function wspolnyPoczatek(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/** A suggestion for the review form; the game summary remains the authority. */
export function odgadnijZiarno(nazwa: string): Ziarno | null {
  const typ = [...RKG_TYPY].sort((a, b) => b.length - a.length)
    .find((t) => nazwa.toLowerCase().startsWith(`${t} `));
  if (!typ) return null;
  const slowa = nazwa.slice(typ.length + 1).toLowerCase().split(' ');
  const odmiana = slowa.shift() ?? '';
  const rzeczOdmieniona = slowa.join(' ');
  const przymiotnik = [...RKG_PRZYMIOTNIKI]
    .filter((s) => pasujeRdzen(s, odmiana))
    .sort((a, b) => rdzen(b).length - rdzen(a).length)[0];
  const rzeczownik = [...RZECZOWNIKI_SEED]
    .sort((a, b) => (wspolnyPoczatek(b, rzeczOdmieniona) - Math.abs(b.length - rzeczOdmieniona.length) / 4)
      - (wspolnyPoczatek(a, rzeczOdmieniona) - Math.abs(a.length - rzeczOdmieniona.length) / 4))[0];
  if (!przymiotnik || !rzeczownik || wspolnyPoczatek(rzeczownik, rzeczOdmieniona) < 3) return null;
  const przypadek = /(?:ego|ej|ych|ich)$/.test(odmiana) ? 'dopelniaczu' : 'mianowniku';
  const liczba = /(?:ych|ich)$/.test(odmiana) ||
    (przypadek === 'mianowniku' && rzeczOdmieniona !== rzeczownik)
    ? 'mnogiej' : 'pojedynczej';
  return { typ, przymiotnik, rzeczownik, liczba, przypadek };
}
