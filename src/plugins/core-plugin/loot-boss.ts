import type { PluginApi } from '@arkadia/plugin-types';
import { registerTokenGate } from '../../lib/registerTokenGate';
import { getMyColor } from '../../lib/colors/my-colors';

const TAG = 'lootBoss';

export function setupBossLoot(api: PluginApi): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const color = getMyColor(3, api);
  const cancel = () => {
    api.triggers.removeByTag(TAG);
    clearTimeout(timer);
    timer = undefined;
  };

  api.aliases.register(/^b\+$/i, () => {
    cancel();
    registerTokenGate(api, 'umarl', /^.+ umarl\.$/, line => {
      api.triggers.removeByTag(TAG);
      timer = setTimeout(() => {
        timer = undefined;
        api.command.send('wez wszystko z ciala');
        api.command.send('wez bronie');
        api.command.send('wez wszystkie zbroje');
        api.command.send('skk');
      }, 12 + Math.floor(Math.random() * 23));
      return line;
    }, TAG);
    api.output.print(new api.AnsiAwareBuffer('--> biere!').color([0, 10], color));
    return true;
  });

  return cancel;
}
