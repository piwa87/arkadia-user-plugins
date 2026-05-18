import type { PluginApi } from '@arkadia/plugin-types';
import { findMatchRange } from '../../../lib/findMatchRange';

export function setupArrivalTrigger(
  api: PluginApi,
  tag: string,
): {
  armArrivalTrigger: (label: string, callback: () => void) => void;
} {
  const arrivalPattern = /(.* (?:z wolna doplywa|przybija) do brzegu\.)/i;
  const accent = api.colors.fromHex('#d97706');

  const runAfterRandomDelay = (callback: () => void) => {
    const delay = Math.floor(Math.random() * (2900 - 768 + 1)) + 768;
    setTimeout(callback, delay);
  };

  const armArrivalTrigger = (label: string, callback: () => void) => {
    api.triggers.registerOneTime(
      arrivalPattern,
      (line) => {
        runAfterRandomDelay(callback);
        return line;
      },
      tag,
    );

    api.output.print(`Temp trigger armed: waiting for arrival (${label})`);
  };

  // Register the arrival coloring trigger
  api.triggers.register(
    arrivalPattern,
    (line, matches) => {
      const range = findMatchRange(line.text, matches[0]);
      return range ? line.color(range, accent) : line;
    },
    tag,
  );

  return { armArrivalTrigger };
}
