import type { PluginApi } from '@arkadia/plugin-types';
import { findMatchRange } from '../../../lib/findMatchRange';
import { registerTempTrigger } from '../../../lib/registerTempTrigger';

export function setupArrivalTrigger(
  api: PluginApi,
  tag: string,
): {
  armArrivalTrigger: (label: string, callback: () => void) => void;
} {
  const arrivalPattern = /(.* (?:z wolna doplywa|przybija) do brzegu\.)/i;
  const accent = api.colors.fromHex('#d97706');

  const armArrivalTrigger = (label: string, callback: () => void) => {
    registerTempTrigger(api, arrivalPattern, 768, 2900, callback, tag);
    api.output.print(`Temp trigger armed: waiting for arrival (${label})`);
  };

  // Register the arrival coloring trigger
  api.triggers.register(
    arrivalPattern,
    (line, matches) => {
      const range = findMatchRange(line.text, matches?.[0] || line.text);
      return range ? line.color(range, accent) : line;
    },
    tag,
  );

  return { armArrivalTrigger };
}
