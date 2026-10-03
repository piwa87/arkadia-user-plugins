// Diagonals precede cardinal directions so regex alternatives match whole names.
const COMPASS_DIRECTIONS = [
  ['northeast', 'ne', 'polnocny-wschod'],
  ['northwest', 'nw', 'polnocny-zachod'],
  ['southeast', 'se', 'poludniowy-wschod'],
  ['southwest', 'sw', 'poludniowy-zachod'],
  ['north', 'n', 'polnoc'],
  ['south', 's', 'poludnie'],
  ['east', 'e', 'wschod'],
  ['west', 'w', 'zachod'],
] as const;

const ALL_DIRECTIONS = [
  ...COMPASS_DIRECTIONS,
  ['up', 'u', 'gora', 'gore'],
  ['down', 'd', 'dol'],
  ['in', 'in'],
  ['out', 'out'],
] as const;

/** Full English map direction -> movement command. */
export const DIRECTION_COMMANDS: Readonly<Record<string, string>> = Object.fromEntries(
  ALL_DIRECTIONS.map(([name, command]) => [name, command]),
);

/** English/Polish names and abbreviations -> full English direction. */
export const EXIT_DIRECTIONS: Readonly<Record<string, string>> = Object.fromEntries(
  ALL_DIRECTIONS.flatMap(([name, ...aliases]) =>
    [name, ...aliases].map((alias) => [alias, name]),
  ),
);

/** The eight Polish compass names -> lowercase movement commands. */
export const POLISH_COMPASS_DIRECTIONS: Readonly<Record<string, string>> = Object.fromEntries(
  COMPASS_DIRECTIONS.map(([, command, polish]) => [polish, command]),
);
