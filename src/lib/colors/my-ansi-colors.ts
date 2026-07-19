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


// Generate individual color constants for convenience (ansi0 through ansi127)

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

