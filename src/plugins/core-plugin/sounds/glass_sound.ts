import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';

const TAG = 'glassSounds';

export function setupGlassSounds(api: PluginApi): void {
  const c3 = getAnsiFormatState(3, api);
  const c4 = getAnsiFormatState(4, api);
  const c38 = getAnsiFormatState(38, api);
  const c41 = getAnsiFormatState(41, api);

  const playGlass = () => api.command.send('play_glass');

  const say = (text: string, color: ReturnType<typeof getAnsiFormatState>) => {
    const buf = new api.AnsiAwareBuffer(text);
    buf.color([0, text.length], color);
    api.output.print(buf);
  };

  const banner = (text: string, color: ReturnType<typeof getAnsiFormatState>) => {
    api.output.print('');
    say(text, color);
    api.output.print('');
  };

  // --- Transport arrivals ---

  api.triggers.register(
    new RegExp(
      [
        'powoli zatrzymuje sie\\.',
        'cicho skrzypiac zatrzymuje sie\\.',
        '(?:z wolna doplywa|przybija) do brzegu\\.',
        'przebiega drzenie',
        'Drzenie przebiega poklad',
        'Powoli pojazd zaczyna tracic predkosc',
        'Monotonne kolysanie ustaje',
      ].join('|'),
    ),
    (line) => {
      banner('        transport        ', c4);
      return line;
    },
    TAG,
  );

  // #region magik burns
  api.triggers.register(
    /^Bialy, zimny plomien ogarnia (.*), w kilka chwil spopielajac .* calkowicie\./,
    (line) => {
      banner('        pozarlo magika        ', c41);
      playGlass();
      return line;
    },
    TAG,
  );

  // --- Light burns out (label-substitute pattern) ---

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeLightOutHandler = (fPlusCmd: string) => (line: any) => {
    playGlass();
    api.command.send(fPlusCmd);
    line.color([0, line.text.length], c3);
    const buf = new api.AnsiAwareBuffer();
    buf.append('[ zle ]', c38);
    line.prepend(' ');
    return line.prependBuffer(buf);
  };

  const LIGHT_OUT: [RegExp, string][] = [
    [
      /(.*(?:pochodnia|luczywo|lampa)) wypala sie i gasnie\./,
      'f+ odloz wypalone pochodnie|zapal pochodnie|zapal swiece|naplam',
    ],
    [/^(.* swieca) wypala sie i gasnie\./, 'f+ odloz wypalone swiece|zapal swiece'],
  ];

  for (const [pattern, fPlusCmd] of LIGHT_OUT) {
    api.triggers.register(pattern, makeLightOutHandler(fPlusCmd), TAG);
  }

  // --- Inventory ---

  // oil flask drained empty
  api.triggers.register(
    /oprozniajac zupelnie .* oleju/,
    (line) => {
      playGlass();
      api.command.send('f+ odloz butelke|ot|wyj butelke|naplam');
      return line;
    },
    TAG,
  );

  // --- Notifications ---

  // new mail arrived
  api.triggers.register(
    /^Masz nowa poczte od (.*)\./,
    (line) => {
      playGlass();
      return line;
    },
    TAG,
  );
}
