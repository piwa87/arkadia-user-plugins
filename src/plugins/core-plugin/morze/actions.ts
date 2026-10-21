import type { PluginApi } from '@arkadia/plugin-types';
import { notify } from '../../../lib/notifications';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { resetMorzeFlags, type MorzeState } from './state';

type Delay = readonly [number, number];
type Sequence = Generator<Delay, void, unknown>;

/** Each yield is one CMud #WAIT. Only the next step is scheduled. */
export function createMorzeActions(api: PluginApi, state: MorzeState) {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const messageColor = getAnsiFormatState(13, api);
  let generation = 0;

  function cancel() {
    generation++;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  }

  function stop() {
    cancel();
    resetMorzeFlags(state);
  }

  function run(sequence: Sequence) {
    const started = generation;
    const next = () => {
      if (started !== generation || !state.enabled) return;
      const step = sequence.next();
      if (step.done || started !== generation) return;
      const [min, max] = step.value;
      const timer = setTimeout(() => {
        timers.delete(timer);
        next();
      }, min + Math.floor(Math.random() * (max - min + 1)));
      timers.add(timer);
    };
    next();
  }

  function message(text: string, sound = false) {
    if (sound) api.command.send('play_tink');
    api.output.print(new api.AnsiAwareBuffer(text, messageColor));
    notify(text);
  }

  function surface() {
    stop();
    state.wyplyn = true;
    api.command.send('u');
  }

  function* searches(count: number, command = 'przeszukaj dno', delay: Delay = [6200, 6700]): Sequence {
    for (let i = 0; i < count; i++) {
      api.command.send(command, false);
      yield delay;
    }
  }

  function search(count: number, command = 'przeszukaj dno', surfaceAfter = false) {
    cancel();
    run((function* () {
      yield* searches(count, command);
      message('DALEJ', true);
      if (surfaceAfter && state.nurek) surface();
    })());
  }

  function continueDive(searchOnBottom: boolean) {
    if (!state.nurkuj) return;
    if (state.glebokoscAkt < state.glebokoscCel) {
      run((function* () {
        yield [234, 678];
        if (!state.nurkuj) return;
        api.command.send('d');
        state.glebokoscAkt++;
      })());
    } else {
      state.nurkuj = false;
      api.command.send('sig Dno!');
      if (searchOnBottom) run((function* () {
        yield [234, 478];
        if (state.nurek) search(8, 'przeszukaj dno', true);
      })());
    }
  }

  function takeSeaweed() {
    if (!state.saWodo) return;
    api.command.send('wez wodorosty', false);
    state.saWodo = false;
  }

  return { cancel, stop, run, message, surface, searches, search, continueDive, takeSeaweed };
}

export type MorzeActions = ReturnType<typeof createMorzeActions>;
