/** Organisation types offered by the club-creation dialogue (CMud `rkgTyp`). */
export const RKG_TYPY: string[] = [
  'banda',
  'brac',
  'bractwo',
  'braterstwo',
  'grupa',
  'hanza',
  'hulajpartia',
  'kancelaria',
  'klub',
  'kompania',
  'krag',
  'liga',
  // `loza` is offered by the live dialogue but was missing from the CMud
  // `rkgTyp` (confirmed against a real `utworz klub` transcript). Without it the
  // generator can never pick it AND the result-capture / wall-validation regexes
  // would reject every `Loza ...` name.
  'loza',
  'organizacja',
  'przymierze',
  'rodzina',
  'spolka handlowa',
  'szajka',
  'trupa',
  'zrzeszenie',
];
