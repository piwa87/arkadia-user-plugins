import type { PluginApi } from '@arkadia/plugin-types';
import type { FormatStateSnapshot } from '@arkadia/plugin-types';
import { colorsHex as fgColors } from './my-colors';
import { bgColorsHex as bgColors } from './my-bg-colors';

/**
 * CMud ANSI Color Palette Generator
 * Creates 128 color combinations from:
 * - 16 foreground colors (0-15)
 * - 8 background colors (0-7)
 *
 * Index mapping: ansi_index = (background_index * 16) + foreground_index
 * - ansi0-15: foreground 0-15 with background 0
 * - ansi16-31: foreground 0-15 with background 1
 * - ansi32-47: foreground 0-15 with background 2
 * - etc. up to ansi112-127: foreground 0-15 with background 7
 */

export type AnsiColorNumber =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36
  | 37
  | 38
  | 39
  | 40
  | 41
  | 42
  | 43
  | 44
  | 45
  | 46
  | 47
  | 48
  | 49
  | 50
  | 51
  | 52
  | 53
  | 54
  | 55
  | 56
  | 57
  | 58
  | 59
  | 60
  | 61
  | 62
  | 63
  | 64
  | 65
  | 66
  | 67
  | 68
  | 69
  | 70
  | 71
  | 72
  | 73
  | 74
  | 75
  | 76
  | 77
  | 78
  | 79
  | 80
  | 81
  | 82
  | 83
  | 84
  | 85
  | 86
  | 87
  | 88
  | 89
  | 90
  | 91
  | 92
  | 93
  | 94
  | 95
  | 96
  | 97
  | 98
  | 99
  | 100
  | 101
  | 102
  | 103
  | 104
  | 105
  | 106
  | 107
  | 108
  | 109
  | 110
  | 111
  | 112
  | 113
  | 114
  | 115
  | 116
  | 117
  | 118
  | 119
  | 120
  | 121
  | 122
  | 123
  | 124
  | 125
  | 126
  | 127;

interface AnsiColor {
  index: number;
  fgIndex: number;
  bgIndex: number;
  foreground: string;
  background: string;
}

function generateAnsiColors(): AnsiColor[] {
  const colors: AnsiColor[] = [];

  for (let bgIdx = 0; bgIdx < bgColors.length; bgIdx++) {
    for (let fgIdx = 0; fgIdx < fgColors.length; fgIdx++) {
      const index = bgIdx * 16 + fgIdx;
      colors.push({
        index,
        fgIndex: fgIdx,
        bgIndex: bgIdx,
        foreground: fgColors[fgIdx],
        background: bgColors[bgIdx],
      });
    }
  }

  return colors;
}

const ANSI_PALETTE = generateAnsiColors();

export const ansiColors = ANSI_PALETTE;

// Generate individual color constants for convenience (ansi0 through ansi127)
export const ansi0 = ANSI_PALETTE[0];
export const ansi1 = ANSI_PALETTE[1];
export const ansi2 = ANSI_PALETTE[2];
export const ansi3 = ANSI_PALETTE[3];
export const ansi4 = ANSI_PALETTE[4];
export const ansi5 = ANSI_PALETTE[5];
export const ansi6 = ANSI_PALETTE[6];
export const ansi7 = ANSI_PALETTE[7];
export const ansi8 = ANSI_PALETTE[8];
export const ansi9 = ANSI_PALETTE[9];
export const ansi10 = ANSI_PALETTE[10];
export const ansi11 = ANSI_PALETTE[11];
export const ansi12 = ANSI_PALETTE[12];
export const ansi13 = ANSI_PALETTE[13];
export const ansi14 = ANSI_PALETTE[14];
export const ansi15 = ANSI_PALETTE[15];
export const ansi16 = ANSI_PALETTE[16];
export const ansi17 = ANSI_PALETTE[17];
export const ansi18 = ANSI_PALETTE[18];
export const ansi19 = ANSI_PALETTE[19];
export const ansi20 = ANSI_PALETTE[20];
export const ansi21 = ANSI_PALETTE[21];
export const ansi22 = ANSI_PALETTE[22];
export const ansi23 = ANSI_PALETTE[23];
export const ansi24 = ANSI_PALETTE[24];
export const ansi25 = ANSI_PALETTE[25];
export const ansi26 = ANSI_PALETTE[26];
export const ansi27 = ANSI_PALETTE[27];
export const ansi28 = ANSI_PALETTE[28];
export const ansi29 = ANSI_PALETTE[29];
export const ansi30 = ANSI_PALETTE[30];
export const ansi31 = ANSI_PALETTE[31];
export const ansi32 = ANSI_PALETTE[32];
export const ansi33 = ANSI_PALETTE[33];
export const ansi34 = ANSI_PALETTE[34];
export const ansi35 = ANSI_PALETTE[35];
export const ansi36 = ANSI_PALETTE[36];
export const ansi37 = ANSI_PALETTE[37];
export const ansi38 = ANSI_PALETTE[38];
export const ansi39 = ANSI_PALETTE[39];
export const ansi40 = ANSI_PALETTE[40];
export const ansi41 = ANSI_PALETTE[41];
export const ansi42 = ANSI_PALETTE[42];
export const ansi43 = ANSI_PALETTE[43];
export const ansi44 = ANSI_PALETTE[44];
export const ansi45 = ANSI_PALETTE[45];
export const ansi46 = ANSI_PALETTE[46];
export const ansi47 = ANSI_PALETTE[47];
export const ansi48 = ANSI_PALETTE[48];
export const ansi49 = ANSI_PALETTE[49];
export const ansi50 = ANSI_PALETTE[50];
export const ansi51 = ANSI_PALETTE[51];
export const ansi52 = ANSI_PALETTE[52];
export const ansi53 = ANSI_PALETTE[53];
export const ansi54 = ANSI_PALETTE[54];
export const ansi55 = ANSI_PALETTE[55];
export const ansi56 = ANSI_PALETTE[56];
export const ansi57 = ANSI_PALETTE[57];
export const ansi58 = ANSI_PALETTE[58];
export const ansi59 = ANSI_PALETTE[59];
export const ansi60 = ANSI_PALETTE[60];
export const ansi61 = ANSI_PALETTE[61];
export const ansi62 = ANSI_PALETTE[62];
export const ansi63 = ANSI_PALETTE[63];
export const ansi64 = ANSI_PALETTE[64];
export const ansi65 = ANSI_PALETTE[65];
export const ansi66 = ANSI_PALETTE[66];
export const ansi67 = ANSI_PALETTE[67];
export const ansi68 = ANSI_PALETTE[68];
export const ansi69 = ANSI_PALETTE[69];
export const ansi70 = ANSI_PALETTE[70];
export const ansi71 = ANSI_PALETTE[71];
export const ansi72 = ANSI_PALETTE[72];
export const ansi73 = ANSI_PALETTE[73];
export const ansi74 = ANSI_PALETTE[74];
export const ansi75 = ANSI_PALETTE[75];
export const ansi76 = ANSI_PALETTE[76];
export const ansi77 = ANSI_PALETTE[77];
export const ansi78 = ANSI_PALETTE[78];
export const ansi79 = ANSI_PALETTE[79];
export const ansi80 = ANSI_PALETTE[80];
export const ansi81 = ANSI_PALETTE[81];
export const ansi82 = ANSI_PALETTE[82];
export const ansi83 = ANSI_PALETTE[83];
export const ansi84 = ANSI_PALETTE[84];
export const ansi85 = ANSI_PALETTE[85];
export const ansi86 = ANSI_PALETTE[86];
export const ansi87 = ANSI_PALETTE[87];
export const ansi88 = ANSI_PALETTE[88];
export const ansi89 = ANSI_PALETTE[89];
export const ansi90 = ANSI_PALETTE[90];
export const ansi91 = ANSI_PALETTE[91];
export const ansi92 = ANSI_PALETTE[92];
export const ansi93 = ANSI_PALETTE[93];
export const ansi94 = ANSI_PALETTE[94];
export const ansi95 = ANSI_PALETTE[95];
export const ansi96 = ANSI_PALETTE[96];
export const ansi97 = ANSI_PALETTE[97];
export const ansi98 = ANSI_PALETTE[98];
export const ansi99 = ANSI_PALETTE[99];
export const ansi100 = ANSI_PALETTE[100];
export const ansi101 = ANSI_PALETTE[101];
export const ansi102 = ANSI_PALETTE[102];
export const ansi103 = ANSI_PALETTE[103];
export const ansi104 = ANSI_PALETTE[104];
export const ansi105 = ANSI_PALETTE[105];
export const ansi106 = ANSI_PALETTE[106];
export const ansi107 = ANSI_PALETTE[107];
export const ansi108 = ANSI_PALETTE[108];
export const ansi109 = ANSI_PALETTE[109];
export const ansi110 = ANSI_PALETTE[110];
export const ansi111 = ANSI_PALETTE[111];
export const ansi112 = ANSI_PALETTE[112];
export const ansi113 = ANSI_PALETTE[113];
export const ansi114 = ANSI_PALETTE[114];
export const ansi115 = ANSI_PALETTE[115];
export const ansi116 = ANSI_PALETTE[116];
export const ansi117 = ANSI_PALETTE[117];
export const ansi118 = ANSI_PALETTE[118];
export const ansi119 = ANSI_PALETTE[119];
export const ansi120 = ANSI_PALETTE[120];
export const ansi121 = ANSI_PALETTE[121];
export const ansi122 = ANSI_PALETTE[122];
export const ansi123 = ANSI_PALETTE[123];
export const ansi124 = ANSI_PALETTE[124];
export const ansi125 = ANSI_PALETTE[125];
export const ansi126 = ANSI_PALETTE[126];
export const ansi127 = ANSI_PALETTE[127];

export const getAnsiColor = (index: AnsiColorNumber): AnsiColor => {
  return ANSI_PALETTE[index];
};

export const getAnsiFormatState = (index: AnsiColorNumber, api: PluginApi): FormatStateSnapshot => {
  const color = ANSI_PALETTE[index];
  return {
    foreground: api.colors.fromHex(color.foreground).foreground,
    background: api.colors.fromHex(color.background).foreground,
  };
};

export const createAnsiColorFormat = (index: AnsiColorNumber, api: PluginApi): FormatStateSnapshot => {
  return getAnsiFormatState(index, api);
};
