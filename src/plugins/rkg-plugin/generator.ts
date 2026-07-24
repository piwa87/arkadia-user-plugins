/**
 * Pure name-generation helpers — no PluginApi, no storage, no side effects, so
 * they are directly unit-testable. `pick` is the port of CMud's `rng` function.
 */

/** CMud `rng(list)` — `%item(%1, %random(1, %numitems(%1)))`. */
export function pick<T>(lista: readonly T[]): T {
  if (lista.length === 0) throw new Error('pick: pusta lista');
  return lista[Math.floor(Math.random() * lista.length)];
}

/** CMud `%proper` — capitalise the first letter of every word. */
export function proper(tekst: string): string {
  return tekst.replace(/(^|\s)(\S)/g, (_, sep: string, znak: string) => sep + znak.toUpperCase());
}
