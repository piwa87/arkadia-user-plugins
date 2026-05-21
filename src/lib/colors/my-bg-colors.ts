import type { PluginApi } from '@arkadia/plugin-types';
import type { FormatStateSnapshot } from '@arkadia/plugin-types';

// Custom CMud background colors (0-7 indexed)
// RGB versions
export const bg0_rgb = 'rgb(0, 0, 0)';
export const bg1_rgb = 'rgb(0, 0, 128)';
export const bg2_rgb = 'rgb(36, 36, 36)';
export const bg3_rgb = 'rgb(75, 44, 44)';
export const bg4_rgb = 'rgb(128, 0, 0)';
export const bg5_rgb = 'rgb(64, 0, 64)';
export const bg6_rgb = 'rgb(14, 69, 28)';
export const bg7_rgb = 'rgb(68, 68, 68)';

// Hex versions
export const bg0 = '#000000';
export const bg1 = '#000080';
export const bg2 = '#242424';
export const bg3 = '#4b2c2c';
export const bg4 = '#800000';
export const bg5 = '#400040';
export const bg6 = '#0e451c';
export const bg7 = '#444444';

export const bgColorsRgb = [bg0_rgb, bg1_rgb, bg2_rgb, bg3_rgb, bg4_rgb, bg5_rgb, bg6_rgb, bg7_rgb];

export const bgColorsHex = [bg0, bg1, bg2, bg3, bg4, bg5, bg6, bg7];

export type BgColorNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const getBgColorRgb = (num: BgColorNumber): string => bgColorsRgb[num];
export const getBgColorHex = (num: BgColorNumber): string => bgColorsHex[num];

export const getBgColor = (bgIndex: BgColorNumber, api: PluginApi): FormatStateSnapshot => {
  return { background: api.colors.fromHex(bgColorsHex[bgIndex]).foreground };
};

export const createBgColorFormat = (bgIndex: BgColorNumber, api: PluginApi): FormatStateSnapshot => {
  return { background: api.colors.fromHex(bgColorsHex[bgIndex]).foreground };
};
