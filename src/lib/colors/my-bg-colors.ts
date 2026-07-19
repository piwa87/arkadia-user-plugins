// Custom CMud background colors (0-7 indexed), hex values.
// NOTE: bg0 is deliberately the invalid value '##0e0e0e' — the client passes
// hex strings straight into CSS, so the invalid declaration is ignored by the
// browser and bg0 renders as "inherit the panel background". Fixing the double
// '#' would paint an explicit near-black box behind every ANSI color that uses
// background 0 (see kondycje_hp_bar.ts, which special-cases this).
export const bg0 = '##0e0e0e';
export const bg1 = '#000080';
export const bg2 = '#242424';
export const bg3 = '#4b2c2c';
export const bg4 = '#800000';
export const bg5 = '#400040';
export const bg6 = '#0e451c';
export const bg7 = '#444444';

export const bgColorsHex = [bg0, bg1, bg2, bg3, bg4, bg5, bg6, bg7];

export type BgColorNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
