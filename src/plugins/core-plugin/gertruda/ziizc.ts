import type { PluginApi } from '@arkadia/plugin-types';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import { registerSequenceStop } from '../../../lib/sequenceStop';
import { notify } from '../../../lib/notifications';
import { pakujZiola } from '../ziola/pakuj';

const TAG = 'gertrudaZiizc';
const DIRECTIONS: Record<string, string> = {
  polnoc: 'n', 'polnocny-wschod': 'ne', wschod: 'e', 'poludniowy-wschod': 'se',
  poludnie: 's', 'poludniowy-zachod': 'sw', zachod: 'w', 'polnocny-zachod': 'nw',
};
const REVERSE: Record<string, string> = { n: 's', ne: 'sw', e: 'w', se: 'nw', s: 'n', sw: 'ne', w: 'e', nw: 'se' };

/** Follow the two road exits, never the optional exits into the wilderness. */
export function setupGertrudaZiizc(api: PluginApi): () => void {
  let road = false;
  let exits: string[] = [];
  let back: string | undefined;
  let remaining = 0;
  let waiting = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let ownMove: string | undefined;

  function stop(message?: string): void {
    clearTimeout(timer);
    remaining = 0;
    waiting = false;
    ownMove = undefined;
    if (message) api.output.print(`ziizc: ${message}`);
  }
  function later(fn: () => void, delay = 6123 + Math.floor(Math.random() * 527)): void {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  }
  function step(): void {
    const forward = exits.filter(dir => dir !== back);
    if (!road || !back || exits.length !== 2 || !exits.includes(back) || forward.length !== 1) {
      stop('Brak pewnego kierunku traktu. Wykonaj recznie krok wzdluz Drogi Czaszek i sprobuj ponownie.');
      return;
    }
    ownMove = forward[0];
    back = REVERSE[ownMove];
    exits = [];
    road = false;
    waiting = true;
    later(() => stop('Brak opisu Drogi Czaszek po ruchu — zatrzymano.'), 10000);
    void api.command.send(ownMove).catch(() => stop('Nie udalo sie wyslac ruchu.'));
  }
  function gather(): void {
    void api.command.send('szukaj ziol');
    later(() => {
      void api.command.send('szukaj ziol');
      later(() => {
        remaining--;
        if (remaining > 0) step();
        else {
          stop();
          pakujZiola(api, undefined, 3);
          void api.command.send('play_tink');
          notify('Ziola: Done!');
        }
      });
    });
  }
  const unregisterStop = registerSequenceStop(api, () => stop());
  const onCommand = (command: string): void => {
    const text = command.trim().toLowerCase();
    const dir = DIRECTIONS[text] ?? (REVERSE[text] ? text : undefined);
    if (!dir) return;
    if (dir === ownMove) { ownMove = undefined; return; }
    if (remaining) stop('Reczny ruch — zatrzymano zbieranie.');
    back = REVERSE[dir];
    exits = [];
    road = false;
  };
  const reset = (): void => { stop(); road = false; exits = []; back = undefined; ownMove = undefined; };
  api.events.on('command', onCommand);
  api.events.on('client.disconnect', reset);
  const onShort = (buf: { text: string }): void => {
    road = buf.text.trim() === 'Droga Czaszek.';
    // gmcp_msg events arrive after all line triggers in the output batch.
    // A matching short description must preserve the exits already parsed.
    if (!road) {
      exits = [];
      if (remaining) stop('Opuszczono Droge Czaszek.');
    }
  };
  api.events.on('gmcp_msg.room.short', onShort);
  registerTokenGate(api, 'Czaszek', /^Droga Czaszek\.$/, line => {
    road = true;
    exits = [];
    return line;
  }, TAG);
  registerTokenGate(api, 'traktem', /^Mozesz podazac traktem na ([a-z-]+) albo ([a-z-]+)\./, (line, matches) => {
    exits = [DIRECTIONS[matches[1]], DIRECTIONS[matches[2]]].filter(Boolean);
    if (waiting && road) {
      waiting = false;
      ownMove = undefined;
      later(gather, 0);
    }
    return line;
  }, TAG);
  const alias = api.aliases.register(/^ziizc(?:\s+(\d+|stop))?$/i, matches => {
    if (matches?.[1]?.toLowerCase() === 'stop') { stop('Zatrzymano.'); return true; }
    if (remaining) { api.output.print('ziizc: Zbieranie juz trwa. Uzyj ziizc stop.'); return true; }
    const count = Number(matches?.[1] ?? 4);
    if (!Number.isSafeInteger(count) || count < 1) { api.output.print('Uzycie: ziizc [liczba krokow > 0] lub ziizc stop'); return true; }
    remaining = count;
    step();
    return true;
  });
  return () => {
    reset();
    unregisterStop();
    api.aliases.remove(alias);
    api.events.off('command', onCommand);
    api.events.off('client.disconnect', reset);
    api.events.off('gmcp_msg.room.short', onShort);
    api.triggers.removeByTag(TAG);
  };
}
