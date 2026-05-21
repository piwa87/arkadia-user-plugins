import type { PluginApi } from '@arkadia/plugin-types';
import type { FormatStateSnapshot } from '@arkadia/plugin-types';

// Custom CMud colors (0-15 indexed)
// RGB versions
export const col0_rgb = 'rgb(128, 128, 128)';
export const col1_rgb = 'rgb(40, 90, 140)';
export const col2_rgb = 'rgb(0, 179, 0)';
export const col3_rgb = 'rgb(166, 166, 166)';
export const col4_rgb = 'rgb(0, 170, 4)';
export const col5_rgb = 'rgb(189, 115, 4)';
export const col6_rgb = 'rgb(255, 0, 0)';
export const col7_rgb = 'rgb(128, 0, 0)';
export const col8_rgb = 'rgb(128, 128, 128)';
export const col9_rgb = 'rgb(0, 106, 213)';
export const col10_rgb = 'rgb(223, 0, 0)';
export const col11_rgb = 'rgb(133, 165, 203)';
export const col12_rgb = 'rgb(81, 126, 49)';
export const col13_rgb = 'rgb(167, 142, 3)';
export const col14_rgb = 'rgb(192, 192, 192)';
export const col15_rgb = 'rgb(255, 255, 255)';

// Hex versions
export const col0 = '#808080';
export const col1 = '#285a8c';
export const col2 = '#00b300';
export const col3 = '#a6a6a6';
export const col4 = '#00aa04';
export const col5 = '#bd7304';
export const col6 = '#ff0000';
export const col7 = '#800000';
export const col8 = '#808080';
export const col9 = '#006ad5';
export const col10 = '#df0000';
export const col11 = '#85a5cb';
export const col12 = '#517e31';
export const col13 = '#a78e03';
export const col14 = '#c0c0c0';
export const col15 = '#ffffff';

export const colorsRgb = [
  col0_rgb,
  col1_rgb,
  col2_rgb,
  col3_rgb,
  col4_rgb,
  col5_rgb,
  col6_rgb,
  col7_rgb,
  col8_rgb,
  col9_rgb,
  col10_rgb,
  col11_rgb,
  col12_rgb,
  col13_rgb,
  col14_rgb,
  col15_rgb,
];

export const colorsHex = [
  col0,
  col1,
  col2,
  col3,
  col4,
  col5,
  col6,
  col7,
  col8,
  col9,
  col10,
  col11,
  col12,
  col13,
  col14,
  col15,
];

export type ColorNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export const getColorRgb = (num: ColorNumber): string => colorsRgb[num];
export const getColorHex = (num: ColorNumber): string => colorsHex[num];

export const getMyColor = (colIndex: ColorNumber, api: PluginApi): FormatStateSnapshot => {
  return api.colors.fromHex(colorsHex[colIndex]);
};

export const createColorFormat = (colIndex: ColorNumber, api: PluginApi): FormatStateSnapshot => {
  return api.colors.fromHex(colorsHex[colIndex]);
};

export const createColorWithBackground = (
  fgIndex: ColorNumber,
  bgIndex: ColorNumber,
  api: PluginApi
): FormatStateSnapshot => {
  return {
    foreground: api.colors.fromHex(colorsHex[fgIndex]).foreground,
    background: api.colors.fromHex(colorsHex[bgIndex]).foreground,
  };
};