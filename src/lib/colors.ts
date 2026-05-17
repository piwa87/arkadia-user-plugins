// Custom CMud colors
export const c1 = "rgb(128, 128, 128)";
export const c2 = "rgb(40, 90, 140)";
export const c3 = "rgb(0, 179, 0)";
export const c4 = "rgb(166, 166, 166)";
export const c5 = "rgb(0, 170, 4)";
export const c6 = "rgb(189, 115, 4)";
export const c7 = "rgb(255, 0, 0)";
export const c8 = "rgb(128, 0, 0)";
export const c9 = "rgb(128, 128, 128)";
export const c10 = "rgb(0, 106, 213)";
export const c11 = "rgb(223, 0, 0)";
export const c12 = "rgb(133, 165, 203)";
export const c13 = "rgb(81, 126, 49)";
export const c14 = "rgb(167, 142, 3)";
export const c15 = "rgb(192, 192, 192)";
export const c16 = "rgb(255, 255, 255)";

// For convenience, also export as an array indexed by color number (1-based)
export const colors = [
  "", // index 0 (unused, for 1-based indexing)
  c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13, c14, c15, c16,
];

// Type for color numbers
export type ColorNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

// Helper function to get color by number
export const getColor = (num: ColorNumber): string => colors[num];
