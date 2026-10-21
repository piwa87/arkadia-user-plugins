import type { PluginApi } from '@arkadia/plugin-types';
import type { MorzeState } from './state';
import type { MorzeActions } from './actions';

export function setupMorzeAliases(
  api: PluginApi,
  state: MorzeState,
  actions: MorzeActions,
  nextDirection: () => string | null,
): void {
  const register = (pattern: RegExp, callback: (m: RegExpMatchArray) => void) => {
    api.aliases.register(pattern, m => {
      if (!state.enabled) api.output.print('[Morze] Modul wylaczony. Wlacz: mr+');
      else if (m) callback(m);
      return true;
    });
  };

  register(/^wyp!$/i, () => actions.surface());
  register(/^nur!\s*(\d+)$/i, m => {
    const depth = Number(m[1]);
    if (!Number.isSafeInteger(depth) || depth < 1 || depth <= state.glebokoscAkt) {
      api.output.print('[Morze] Podaj glebokosc wieksza od aktualnej (co najmniej 1).');
      return;
    }
    actions.stop();
    state.glebokoscCel = depth;
    state.nurkuj = true;
    api.command.send('d');
    if (state.glebokoscAkt > 0) state.glebokoscAkt++;
  });
  register(/^wodor!\s+(.+)$/i, m => {
    actions.stop();
    state.wodorosty = true;
    state.wodorostyKier = m[1];
    api.command.send('wez wodorosty', false);
    api.command.send(state.wodorostyKier);
  });
  register(/^wrak!$/i, () => actions.search(8, 'szukaj wraku', true));
  register(/^per8$/i, () => actions.search(8, 'przeszukaj dno', true));
  register(/^per4$/i, () => actions.search(4));

  api.aliases.register(/^qu$/i, () => {
    actions.stop();
    api.command.send('sig Quit done!');
    return true;
  });

  function* amber(continuation: boolean): Generator<readonly [number, number], void, unknown> {
    do {
      const direction = nextDirection();
      if (!direction) {
        state.bur = false;
        api.command.send('sig Koniec trasy.');
        if (continuation) actions.message('KONIEC TRASY');
        return;
      }
      const from = api.map.getRoom()?.id;
      api.command.send(direction);
      yield* actions.searches(4);
      if (!state.bur) return;
      // Do not repeat a stale next_dir when the movement failed.
      if (api.map.getRoom()?.id === from) {
        actions.stop();
        api.output.print('[Morze] Brak zmiany lokacji — zatrzymano szukanie bursztynow.');
        return;
      }
      yield [234, 890];
      continuation = true;
    } while (state.bur);
  }
  register(/^bur!$/i, () => {
    actions.stop();
    state.bur = true;
    actions.run(amber(false));
  });
  register(/^bur!!$/i, () => {
    actions.cancel();
    actions.run(amber(true));
  });

  register(/^perly!$/i, () => {
    actions.stop();
    api.command.send('dobs');
    for (let i = 0; i < 5; i++) {
      api.command.send('otworz muszle sztyletem', false);
      api.command.send('wez perle z muszli', false);
      api.command.send('wlz muszle');
    }
    api.command.send('opus');
  });

  register(/^nurk\s+(.+)$/i, m => {
    actions.stop();
    state.seaweedArmed = true;
    actions.run((function* () {
      for (let i = 0; i < 3; i++) {
        actions.takeSeaweed();
        api.command.send('d');
        yield [6200, 6600];
      }
      yield [789, 789];
      api.command.send('sp');
      yield* actions.searches(5, 'przeszukaj dno', [6200, 6600]);
      actions.takeSeaweed();
      api.command.send(m[1]);
      yield [6400, 6800];
      yield* actions.searches(5, 'przeszukaj dno', [6100, 6700]);
      for (let i = 0; i < 3; i++) {
        actions.takeSeaweed();
        api.command.send('u');
        yield [6200, 6600];
      }
      actions.message('NEXT MOVE');
    })());
  });

  register(/^nurek!$/i, () => {
    actions.stop();
    state.glebokoscCel = 3;
    state.nurkuj = true;
    state.nurek = true;
    api.command.send('d');
    if (state.glebokoscAkt > 0) state.glebokoscAkt++;
  });
  register(/^per!\s+(.+)$/i, m => {
    actions.stop();
    actions.run((function* () {
      api.command.send(m[1]);
      yield [6200, 6700];
      yield* actions.searches(5);
      actions.message('DALEJ', true);
    })());
  });
}
