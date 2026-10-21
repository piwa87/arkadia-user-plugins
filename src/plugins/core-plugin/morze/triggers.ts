import type { PluginApi } from '@arkadia/plugin-types';
import type { MorzeState } from './state';
import type { MorzeActions } from './actions';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { getMyColor } from '../../../lib/colors/my-colors';
import { registerTokenGate } from '../../../lib/registerTokenGate';

export function setupMorzeTriggers(api: PluginApi, state: MorzeState, actions: MorzeActions): () => void {
  const TAG = 'morze';
  const blue = getAnsiFormatState(111, api);
  const warning = getAnsiFormatState(37, api);
  const critical = getAnsiFormatState(42, api);
  const depthColor = getAnsiFormatState(126, api);
  const shell = getAnsiFormatState(12, api);
  const found = getAnsiFormatState(3, api);
  const current = getAnsiFormatState(6, api);
  const grey = getMyColor(8, api);
  const register = (
    tokens: string | string[],
    pattern: RegExp,
    callback: Parameters<typeof registerTokenGate>[3],
  ) => registerTokenGate(api, tokens, pattern, (line, m, type, original) =>
    state.enabled ? callback(line, m, type, original) : line, TAG);

  register(['przeplynac', 'asdjagshdgasd'], /(?:Udaje ci sie sprawnie przeplynac|asdjagshdgasd)\./, line => {
    if (state.wyplyn) actions.run((function* () {
      yield [234, 678];
      if (state.wyplyn) api.command.send('u');
    })());
    actions.continueDive(true);
    if (state.wodorosty) actions.run((function* () {
      yield [234, 678];
      if (!state.wodorosty) return;
      api.command.send('wez wodorosty', false);
      api.command.send(state.wodorostyKier);
    })());
    return line.prepend(' * ', blue);
  });

  register('Przebywanie', /^Przebywanie pod woda staje sie coraz trudniejsze\. Pomysl o wyplynieciu na powierzchnie\./,
    line => line.prepend('      powietrze:   UWAGA      ', warning));

  register('Wynurzasz', /(?:Wynurzasz sie na powierzchnie|Wynurzasz sie z wody|Wynurzasz sie na powierzchnie lapczywie lapiac powietrze w pluca)\./, line => {
    state.wyplyn = false;
    state.glebokoscAkt = 0;
    return line.prepend(' A I R ', blue);
  });

  register(['tlenu', 'pluca', 'pluc'], /^(?:W twych plucach braknie juz tlenu\. Lepiej wyplyn natychmiast\.|Czujesz ze za chwile pluca pekna ci z braku tlenu\. Wyplyn natychmiast!|Twoje pluca rozdziera ogromny bol\. Dusisz sie!|Woda wdziera sie do twoich pluc\. Dlawisz sie i krztusisz, az w koncu ciemnosc zasnuwa ci oczy\.)/, line => {
    api.command.send('play_tink');
    // XML's @wodor is undefined; the seaweed mode is named @wodorosty.
    if (state.wodorosty) {
      actions.stop();
      actions.run((function* () {
        yield [245, 533];
        api.command.send('przestan plynac', false);
        yield [245, 533];
        actions.surface();
      })());
    }
    return line.prepend('      powietrze:   WYPLYN      ', critical);
  });

  register('Zanurzasz', /^Zanurzasz sie pod wode\.$/, line => {
    state.glebokoscAkt = 1;
    actions.continueDive(false);
    return line.prepend(' * ', blue);
  });

  register('Znalazles', /^Znalazles (.* muszle)\.$/, (line, m) => {
    line.replace([0, line.text.length], `Znalazles ${m[1]}`);
    line.color([0, 'Znalazles '.length], found);
    return line.color(['Znalazles '.length, line.text.length], shell);
  });
  register('interesujacego', /^Nie udalo ci sie znalezc niczego interesujacego\.$/,
    line => line.color([0, line.text.length], grey));

  const depths = [
    { tokens: ['plyciznie', 'woda', 'glebiny', 'morskie'], names: ['na plyciznie', 'pod woda', 'glebiny', 'mroczne glebiny', 'dno morskie'] },
    { tokens: ['morza', 'glebina', 'glebinie'], names: ['tuz pod powierzchnia morza', 'morska glebina', 'w mrocznej glebinie'] },
  ];
  for (const { tokens, names } of depths) {
    register(tokens, new RegExp(`^(${names.join('|')})\\.$`), (line, m) =>
      line.prepend(`[${names.indexOf(m[1]) + 1}] `, depthColor));
  }

  register('wyjmujesz', /Ostroznie wyjmujesz perle z .*/, line => line.prepend(' PERLA ', blue));
  register('bursztyn', /^.*az w koncu natrafiasz na zoltawobrazowy bursztyn\./, line => {
    // The original goodies.wav is not shipped; use the existing reward chime.
    api.command.send('play_ding');
    return line.prepend(' * ', blue);
  });
  register('zywiolem', /Nie masz juz sil walczyc z zywiolem i dajesz sie poniesc pradowi na dol\./, line => {
    api.output.print(new api.AnsiAwareBuffer('OJ OJ OJ OJ', current));
    api.command.send('play_basso');
    return line;
  });
  register('wodorosty', /(wodorosty)/, line => {
    if (state.seaweedArmed) {
      state.saWodo = true;
      state.seaweedArmed = false;
    }
    return line;
  });

  // air_troche / air_dlugo belong to XML's disabled archive class.
  return () => api.triggers.removeByTag(TAG);
}
