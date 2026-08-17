import type { PluginApi } from '@arkadia/plugin-types';
import type { MorzeState } from './state';
import { resetMorzeFlags } from './state';
import { loopSearch } from './triggers';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';

/**
 * Random delay helper — mirrors CMUD's #WAIT %random(min,max).
 */
function randWait(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Play a notification beep + message.
 * Mirrors CMUD's play_tink / #MESSAGE pattern.
 */
function notify(api: PluginApi, msg: string): void {
  api.command.send('', true);
  const buf = new api.AnsiAwareBuffer();
  buf.append(msg, getAnsiFormatState(13, api));
  api.output.print(buf);
}

/**
 * Sequential command executor.
 * Each step: runs a command/function, then waits the given delay.
 * Mirrors CMUD's flat list of #SEND / #WAIT pairs.
 */
interface Step {
  cmd?: string;
  fn?: () => void;
  wait: [number, number];
}

function runSeq(api: PluginApi, steps: Step[]): void {
  let t = 0;
  for (const s of steps) {
    const delay = randWait(s.wait[0], s.wait[1]);
    if (s.cmd || s.fn) {
      setTimeout(() => {
        if (s.cmd) api.command.send(s.cmd, false);
        s.fn?.();
      }, t);
    }
    t += delay;
  }
}

/**
 * Run N iterations of the same command with delays between each.
 * Mirrors CMUD's #LOOP N { command; #WAIT %random(min,max) }.
 */
function loopCmd(
  api: PluginApi,
  count: number,
  cmd: string,
  waitMin: number,
  waitMax: number,
  preCmd?: (i: number) => void,
): void {
  let t = 0;
  for (let i = 0; i < count; i++) {
    if (preCmd) {
      setTimeout(() => preCmd(i), t);
    }
    setTimeout(() => {
      api.command.send(cmd, false);
    }, t);
    t += randWait(waitMin, waitMax);
  }
}

// ── Alias registration ──────────────────────────────────────────────────────

export function setupMorzeAliases(api: PluginApi, state: MorzeState): void {
  // ── wyp! — emergency surface ──────────────────────────────────────────
  api.aliases.register(/^wyp!$/i, () => {
    state.wodorosty = false;
    state.nurek = false;
    state.nurkuj = false;
    state.wyplyn = true;
    api.command.send('u');
    return true;
  });

  // ── nur! <depth> — dive to specific depth ─────────────────────────────
  api.aliases.register(/^nur!\s*(\d+)$/i, (m) => {
    state.glebokoscCel = parseInt(m![1], 10);
    state.nurkuj = true;
    api.command.send('d');
    return true;
  });

  // ── wodor! <dir> — seaweed gathering mode ─────────────────────────────
  api.aliases.register(/^wodor!\s*(\w+)$/i, (m) => {
    state.wodorosty = true;
    state.wodorostyKier = m![1];
    api.command.send('wez wodorosty', false);
    api.command.send(state.wodorostyKier);
    return true;
  });

  // ── wrak! — 8 wrecks searches, then exit ──────────────────────────────
  api.aliases.register(/^wrak!$/i, () => {
    loopSearch(api, 8, undefined, undefined, undefined, () => {
      notify(api, 'DALEJ');
      if (state.nurek) {
        state.nurek = false;
        state.wyplyn = true;
        api.command.send('u');
      }
    });
    return true;
  });

  // ── qu — quit all sea modes ───────────────────────────────────────────
  api.aliases.register(/^qu$/i, () => {
    resetMorzeFlags(state);
    api.output.print(new api.AnsiAwareBuffer('Quit done!'));
    return true;
  });

  // ── bur! — start amber searching (4× search, then loop) ──────────────
  api.aliases.register(/^bur!$/i, () => {
    state.bur = true;
    loopSearch(api, 4, undefined, undefined, undefined, () => {
      if (state.bur) {
        setTimeout(() => {
          loopSearch(api, 4, undefined, undefined, undefined, () => {
            if (state.bur) {
              setTimeout(() => loopSearch(api, 4), randWait(234, 890));
            }
          });
        }, randWait(234, 890));
      }
    });
    return true;
  });

  // ── perly! — open shells with dagger ──────────────────────────────────
  api.aliases.register(/^perly!$/i, () => {
    runSeq(api, [
      { cmd: 'dobs', wait: [0, 0] },
      { cmd: 'otworz muszle sztyletem', wait: [200, 400] },
      { cmd: 'wez perle z muszli', wait: [200, 400] },
      { cmd: 'wlz muszle', wait: [200, 400] },
      { cmd: 'otworz muszle sztyletem', wait: [200, 400] },
      { cmd: 'wez perle z muszli', wait: [200, 400] },
      { cmd: 'wlz muszle', wait: [200, 400] },
      { cmd: 'otworz muszle sztyletem', wait: [200, 400] },
      { cmd: 'wez perle z muszli', wait: [200, 400] },
      { cmd: 'wlz muszle', wait: [200, 400] },
      { cmd: 'otworz muszle sztyletem', wait: [200, 400] },
      { cmd: 'wez perle z muszli', wait: [200, 400] },
      { cmd: 'wlz muszle', wait: [200, 400] },
      { cmd: 'otworz muszle sztyletem', wait: [200, 400] },
      { cmd: 'wez perle z muszli', wait: [200, 400] },
      { cmd: 'wlz muszle', wait: [200, 400] },
      { cmd: 'opus', wait: [200, 400] },
    ]);
    return true;
  });

  // ── per8 — 8 bottom searches ──────────────────────────────────────────
  api.aliases.register(/^per8$/i, () => {
    loopSearch(api, 8, undefined, undefined, undefined, () => {
      notify(api, 'DALEJ');
      if (state.nurek) {
        state.nurek = false;
        state.wyplyn = true;
        api.command.send('u');
      }
    });
    return true;
  });

  // ── per4 — 4 bottom searches ──────────────────────────────────────────
  api.aliases.register(/^per4$/i, () => {
    loopSearch(api, 4, undefined, undefined, undefined, () => {
      notify(api, 'DALEJ');
    });
    return true;
  });

  // ── nurk <dir> — full pearl diving routine ───────────────────────────
  api.aliases.register(/^nurk\s+(.+)$/i, (m) => {
    const dir = m![1];

    // Phase 1: dive 3 steps with optional seaweed
    loopCmd(api, 3, 'd', 6200, 6600, () => {
      if (state.saWodo) {
        api.command.send('wez wodorosty', false);
        state.saWodo = false;
      }
    });

    // Phase 2: after diving, sp + 5 searches
    const phase1End = 3 * randWait(6200, 6600);
    setTimeout(() => {
      api.command.send('sp', false);
    }, phase1End + 789);

    const searchStart = phase1End + 789 + randWait(6200, 6600);
    loopCmdDelayed(api, 5, 'przeszukaj dno', 6200, 6600, searchStart);

    // Phase 3: move direction, 5 more searches
    const moveStart = searchStart + 5 * randWait(6200, 6600);
    setTimeout(() => {
      // seaweed check before moving
      if (state.saWodo) {
        api.command.send('wez wodorosty', false);
        state.saWodo = false;
      }
      api.command.send(dir);
    }, moveStart);

    const afterMoveStart = moveStart + randWait(6400, 6800);
    loopCmdDelayed(api, 5, 'przeszukaj dno', 6100, 6700, afterMoveStart);

    // Phase 4: surface 3 steps with optional seaweed
    const surfaceStart = afterMoveStart + 5 * randWait(6100, 6700);
    loopCmdDelayed(api, 3, 'u', 6200, 6600, surfaceStart, () => {
      if (state.saWodo) {
        api.command.send('wez wodorosty', false);
        state.saWodo = false;
      }
    });

    // Final notification
    const endTime = surfaceStart + 3 * randWait(6200, 6600);
    setTimeout(() => {
      notify(api, 'NEXT MOVE');
    }, endTime);

    return true;
  });

  // ── nurek! — pearl diver mode (depth 3, auto-dive) ───────────────────
  api.aliases.register(/^nurek!$/i, () => {
    state.glebokoscCel = 3;
    state.nurkuj = true;
    state.nurek = true;
    api.command.send('d');
    return true;
  });

  // ── per! <dir> — search bottom path once ──────────────────────────────
  api.aliases.register(/^per!\s+(.+)$/i, (m) => {
    const dir = m![1];
    api.command.send(dir);
    setTimeout(() => {
      loopSearch(api, 5, undefined, undefined, undefined, () => {
        notify(api, 'DALEJ');
      });
    }, randWait(6200, 6700));
    return true;
  });
}

/**
 * Like loopCmd but starts at a specific absolute time offset.
 */
function loopCmdDelayed(
  api: PluginApi,
  count: number,
  cmd: string,
  waitMin: number,
  waitMax: number,
  startAt: number,
  preCmd?: (i: number) => void,
): void {
  let t = startAt;
  for (let i = 0; i < count; i++) {
    if (preCmd) {
      setTimeout(() => preCmd(i), t);
    }
    setTimeout(() => {
      api.command.send(cmd, false);
    }, t);
    t += randWait(waitMin, waitMax);
  }
}