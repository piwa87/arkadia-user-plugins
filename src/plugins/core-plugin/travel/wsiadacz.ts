import type { PluginApi } from '@arkadia/plugin-types';
import { getAnsiFormatState } from '../../../lib/colors/my-ansi-colors';
import { withDelay } from '../../../lib/withDelay';

export function setupWsiadaczAliases(api: PluginApi): void {
  const feedbackColor = getAnsiFormatState(3, api);
  const tagStatek = 'wsiadacz_statek';
  const tagWoz = 'wsiadacz_woz';
  const tagStatekNed = 'wsiadacz_statek_ned';

  const printFeedback = (text: string) => {
    const buf = new api.AnsiAwareBuffer(text);
    buf.color([0, text.length], feedbackColor);
    api.output.print(buf);
  };

  // #region na_statek - arm a one-shot trigger that shows a visual block when boarding succeeds
  {
    const blockColor = getAnsiFormatState(34, api);
    const blockLines = ['                            ', '     WLAZLES NA STATEK!     ', '                            '];
    const oneShotTag = 'na_statek_oneshot';

    api.aliases.register(/^na_statek$/, () => {
      api.triggers.removeByTag(oneShotTag);
      api.triggers.registerOneTime(/^Wchodzisz/, (line) => {
        for (const l of blockLines) {
          const buf = new api.AnsiAwareBuffer(l);
          buf.color([0, l.length], blockColor);
          api.output.print(buf);
        }
        return line;
      }, oneShotTag);
      return true;
    });
  }

  // #region ned+
  api.aliases.register(/^ned\+$/, () => {
    api.triggers.removeByTag(tagStatekNed);

    api.triggers.registerOneTime(/(doplywa|przybija) do brzegu/, (line) => {
      withDelay(768, 2900, () => api.command.send('ned'));
      return line;
    }, tagStatekNed);

    printFeedback('--> zsiade!');
    return true;
  });

  // #region op+
  api.aliases.register(/^op\+$/, () => {
    api.triggers.removeByTag(tagStatek);
    api.triggers.removeByTag(tagWoz);

    api.triggers.registerOneTime(/(doplywa|przybija) do brzegu/, (line) => {
      api.triggers.removeByTag(tagWoz);
      withDelay(768, 2900, () => api.command.send('op'));
      return line;
    }, tagStatek);

    api.triggers.registerOneTime(/(woz z plandeka|woz|powoz|dylizans) powoli zatrzymuje sie/, (line) => {
      api.triggers.removeByTag(tagStatek);
      withDelay(768, 2900, () => api.command.send('opw'));
      return line;
    }, tagWoz);

    printFeedback('--> wsiade!');
    return true;
  });

  // #region op++
  api.aliases.register(/^op\+\+$/, () => {
    api.triggers.removeByTag(tagStatek);
    api.triggers.removeByTag(tagWoz);

    api.triggers.registerOneTime(/(doplywa|przybija) do brzegu/, (line) => {
      api.triggers.removeByTag(tagWoz);
      withDelay(768, 2900, () => {
        api.command.send('op');
        api.command.send('ned+');
      });
      return line;
    }, tagStatek);

    printFeedback('--> wsiade i zsiade!!');
    return true;
  });
}
