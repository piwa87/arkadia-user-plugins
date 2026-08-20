import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { getMyColor } from '../../../lib/colors/my-colors';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import { rewrite } from './banner';
import { teamNominativeForms } from './team_state';

/**
 * Leadership handover banners and team-loss audio cues.
 *
 * Migrated from CMUD `mod_druzyna` (triggers 8101-8103 and the sound halves of
 * `team_gubi` / `team_disc`). The `prpr` alias lives in team_aliases.ts.
 *
 * The visual/bookkeeping side of losing a team member is NOT reimplemented: the
 * web client already tracks it far better (lostTeamMates.ts marks who was lost
 * and in which room, colors the disconnect line, and feeds the map). Only the
 * audio cue the client has no equivalent for is kept here.
 */

export function setupLider(api: PluginApi, tag: string): void {
  const c3 = getAnsiFormatState(3, api); // %ansi(3) — handover banners
  const c9 = getAnsiFormatState(9, api); // %ansi(9) — the new leader's name
  const reset = getMyColor(0, api); // %ansi(0) — foreground-only reset

  const send = (cmd: string) => api.command.send(cmd);

  // ---- 8101: "Przekazujesz prowadzenie druzyny <X>." — you hand it over -----
  registerTokenGate(
    api,
    'przekazujesz',
    /^Przekazujesz prowadzenie druzyny (.*)\.$/,
    (line, m) => {
      rewrite(line, [
        ['*     ', reset],
        ['PRZEKAZUJESZ PROWADZENIE.....', c3],
        [m[1], c9],
      ]);
      return line;
    },
    tag,
  );

  // ---- 8102: "<X> przekazuje ci prowadzenie druzyny." — you take over -------
  // The original line is left intact; the banner is printed around it.
  const PROWADZISZ = '       P R O W A D Z I S Z !'.repeat(5);
  registerTokenGate(
    api,
    'przekazuje',
    /^(.*) przekazuje ci prowadzenie druzyny\.$/,
    (line) => {
      for (const text of ['', PROWADZISZ, '']) {
        const buf = new api.AnsiAwareBuffer();
        buf.append(text, c3);
        api.output.print(buf);
      }
      return line;
    },
    tag,
  );

  // ---- 8103: "<X> przekazuje prowadzenie druzyny <Y>." — someone else -------
  registerTokenGate(
    api,
    'przekazuje',
    /^(.*) przekazuje prowadzenie druzyny (.*)\.$/,
    (line, m) => {
      rewrite(line, [
        [`${m[1]} `, reset],
        ['     PRZEKAZAL DRUZYNE:      [', c3],
        [m[2], reset],
        [']', c3],
      ]);
      return line;
    },
    tag,
  );

  // ---- team_gubi (sound half): "Gubisz gdzies za soba <X>." ------------------
  // The client's lostTeamMates.ts owns the bookkeeping and the map markers —
  // this only restores the audio cue.
  registerTokenGate(
    api,
    'gubisz',
    /^Gubisz gdzies za soba (.*)\.$/,
    (line) => {
      send('play_basso');
      return line;
    },
    tag,
  );

  // ---- team_disc (sound half): "<X> traci kontakt z rzeczywistoscia." --------
  // Only for our own team, and only when they actually dropped: the trailing
  // "Mimo to, nie opuszcza swiata Arkadii." means the character stayed in game,
  // so there is nothing to alert about.
  registerTokenGate(
    api,
    'kontakt',
    /^(.*) traci kontakt z rzeczywistoscia\.(.*)$/,
    (line, m) => {
      if (/Mimo to/.test(m[2] ?? '')) return line;
      if (!teamNominativeForms().has((m[1] ?? '').trim().toLowerCase())) return line;
      send('play_basso');
      return line;
    },
    tag,
  );
}

export function destroyLider(api: PluginApi): void {
  // The triggers are removed via api.triggers.removeByTag(tag).
}
