export function withDelay(minMs: number, maxMs: number, fn: () => void): void {
  const ms = Math.floor(Math.random() * (maxMs - minMs) + minMs);
  setTimeout(fn, ms);
}
