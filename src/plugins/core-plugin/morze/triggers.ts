import type { PluginApi } from '@arkadia/plugin-types';
import type { MorzeState } from './state';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { withDelay } from '../../../lib/withDelay';
import { registerTokenGate } from '../../../lib/registerTokenGate';

/**
 * Random delay helper.
 */
function randWait(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Run a loop of N search/action iterations with random delays.
 * Mirrors CMUD's #LOOP N { command; #WAIT %random(min,max) }.
 */
export function loopSearch(
  api: PluginApi,
  count: number,
  actionCmd: string = 'przeszukaj dno',
  waitMin: number = 6200,
  waitMax: number = 6700,
  onDone?: () => void,
): void {
  let i = 0;
  const next = () => {
    if (i >= count) {
      onDone?.();
      return;
    }
    api.command.send(actionCmd, false);
    i++;
    setTimeout(next, randWait(waitMin, waitMax));
  };
  next();
}

/**
 * Emergency surface — resets all flags and swims up.
 */
export function emergencySurface(api: PluginApi, state: MorzeState): void {
  state.wodorosty = false;
  state.nurek = false;
  state.nurkuj = false;
  state.wyplyn = true;
  api.command.send('u');
}

// ── Colors ─────────────────────────────────────────────────────────────────

const enum Col {
  BlueBg = 111,
  White = 37,
  RedBg = 42,
  Purple = 35,
  Cyan = 126,
  LightBlue = 12,
  Grey = 8,
  Yellow = 3,
  Default = 7,
  Orange = 6,
}

// ── Trigger setup ───────────────────────────────────────────────────────────

export function setupMorzeTriggers(api: PluginApi, state: MorzeState): () => void {
  const TAG = 'morze';
  const c = (code: Col) => getAnsiFormatState(code, api);

  // ── 1. Water swimming — auto-dive/auto-surface/seaweed (token-gated) ──
  registerTokenGate(
    api,
    'przeplynac',
    /(?:Udaje ci sie sprawnie przeplynac|asdjagshdgasd)\./,
    () => {
      const buf = new api.AnsiAwareBuffer();
      buf.append(' * ', c(Col.BlueBg));
      api.output.print(buf);

      if (state.wyplyn) {
        withDelay(234, 678, () => api.command.send('u'));
      }

      if (state.nurkuj) {
        if (state.glebokoscAkt !== state.glebokoscCel) {
          withDelay(234, 678, () => {
            api.command.send('d');
            state.glebokoscAkt += 1;
          });
        } else {
          state.nurkuj = false;
          api.output.print(new api.AnsiAwareBuffer('Dno!'));
          withDelay(234, 478, () => {
            if (state.nurek) {
              loopSearch(api, 8, undefined, undefined, undefined, () => {
                if (state.nurek) emergencySurface(api, state);
              });
            }
          });
        }
      }

      if (state.wodorosty) {
        withDelay(234, 678, () => {
          api.command.send('wez wodorosty', false);
          api.command.send(state.wodorostyKier);
        });
      }

      return null;
    },
    TAG,
  );

  // ── 2. Air warning (full-line) ────────────────────────────────────────
  api.triggers.register(
    /^Przebywanie pod woda staje sie coraz trudniejsze\. Pomysl o wyplynieciu na powierzchnie\.$/,
    () => {
      const buf = new api.AnsiAwareBuffer();
      buf.append('      powietrze:   UWAGA      ', c(Col.White));
      api.output.print(buf);
      return null;
    },
    TAG,
  );

  // ── 3. Surface detection (full-line) ──────────────────────────────────
  api.triggers.register(
    /^(?:Wynurzasz sie na powierzchnie|Wynurzasz sie z wody|Wynurzasz sie na powierzchnie lapczywie lapiac powietrze w pluca)\.$/,
    () => {
      state.wyplyn = false;
      state.glebokoscAkt = 0;
      const buf = new api.AnsiAwareBuffer();
      buf.append(' A I R ', c(Col.BlueBg));
      api.output.print(buf);
      return null;
    },
    TAG,
  );

  // ── 4. Critical air — emergency auto-surface (full-line) ──────────────
  api.triggers.register(
    /^(?:W twych plucach braknie juz tlenu\. Lepiej wyplyn natychmiast\.|Czujesz ze za chwile pluca pekna ci z braku tlenu\. Wyplyn natychmiast!|Twoje pluca rozdziera ogromny bol\. Dusisz sie!|Woda wdziera sie do twoich pluc\. Dlawisz sie i krztusisz, az w koncu ciemnosc zasnuwa ci oczy\.)$/,
    () => {
      const buf = new api.AnsiAwareBuffer();
      buf.append('      powietrze:   WYPLYN      ', c(Col.RedBg));
      api.output.print(buf);
      api.command.send(''); // beep

      if (state.wodorosty) {
        state.wodorosty = false;
        setTimeout(() => {
          api.command.send('przestan plynac', false);
          setTimeout(() => emergencySurface(api, state), randWait(245, 533));
        }, randWait(245, 533));
      }

      return null;
    },
    TAG,
  );

  // ── 5. Dive detection (full-line) ─────────────────────────────────────
  api.triggers.register(/^Zanurzasz sie pod wode\.$/, () => {
    state.glebokoscAkt = 1;
    const buf = new api.AnsiAwareBuffer();
    buf.append(' * ', c(Col.BlueBg));
    buf.append('zanurzasz sie pod wode', c(Col.Default));
    api.output.print(buf);

    if (state.nurkuj) {
      if (state.glebokoscAkt !== state.glebokoscCel) {
        withDelay(234, 678, () => {
          api.command.send('d');
          state.glebokoscAkt += 1;
        });
      } else {
        state.nurkuj = false;
        api.output.print(new api.AnsiAwareBuffer('Dno!'));
      }
    }

    return null;
  }, TAG);

  // ── 6. Shell found (token-gated — "Znalazles" is line-unique) ─────────
  registerTokenGate(
    api,
    'Znalazles',
    /^Znalazles (.* muszle)\.$/,
    (_line, m) => {
      const buf = new api.AnsiAwareBuffer();
      buf.append('Znalazles ', c(Col.Yellow));
      buf.append(m[1], c(Col.LightBlue));
      api.output.print(buf);
      return null;
    },
    TAG,
  );

  // ── 7. Nothing found (token-gated — cheap) ────────────────────────────
  registerTokenGate(
    api,
    'interesujacego',
    /^Nie udalo ci sie znalezc niczego interesujacego\.$/,
    () => {
      const buf = new api.AnsiAwareBuffer();
      buf.append('(nic)', c(Col.Grey));
      api.output.print(buf);
      return null;
    },
    TAG,
  );

  // ── 8. Depth display — combined viadaza + nilfgaard (token-gated) ────
  registerTokenGate(
    api,
    'plyciznie',
    /^(na plyciznie|pod woda|glebiny|mroczne glebiny|dno morskie|tuz pod powierzchnia morza|morska glebina|w mrocznej glebinie)\.$/,
    (_line, m) => {
      const buf = new api.AnsiAwareBuffer();
      buf.append('[', c(Col.Cyan));
      buf.append(m[1], c(Col.Default));
      buf.append(']', c(Col.Cyan));
      api.output.print(buf);
      return null;
    },
    TAG,
  );

  // ── 9. Pearl found (token-gated) ──────────────────────────────────────
  registerTokenGate(
    api,
    'wyjmujesz',
    /Ostroznie wyjmujesz perle z .*/,
    () => {
      const buf = new api.AnsiAwareBuffer();
      buf.append(' PERLA ', c(Col.BlueBg));
      api.output.print(buf);
      return null;
    },
    TAG,
  );

  // ── 10. Amber found (token-gated) ─────────────────────────────────────
  registerTokenGate(
    api,
    'bursztyn',
    /^.*az w koncu natrafiasz na zoltawobrazowy bursztyn\./,
    () => {
      const buf = new api.AnsiAwareBuffer();
      buf.append(' * ', c(Col.BlueBg));
      api.output.print(buf);
      return null;
    },
    TAG,
  );

  // ── 11. Nilfgaard current warning (token-gated) ───────────────────────
  registerTokenGate(
    api,
    'zywiolem',
    /^Nie masz juz sil walczyc z zywiolem i dajesz sie poniesc pradowi na dol\.$/,
    () => {
      const buf = new api.AnsiAwareBuffer();
      buf.append('OJ OJ OJ OJ', c(Col.Orange));
      api.output.print(buf);
      api.command.send('say OJ OJ OJ OJ');
      return null;
    },
    TAG,
  );

  return () => api.triggers.removeByTag(TAG);
}