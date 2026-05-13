export function findMatchRange(text: string, match: string): [number, number] | null {
  const start = text.indexOf(match);
  if (start === -1) {
    return null;
  }

  return [start, start + match.length];
}
