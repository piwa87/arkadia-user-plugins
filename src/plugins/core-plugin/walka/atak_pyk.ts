import type { PluginApi } from '@arkadia/plugin-types';
import { col13 } from '../../../lib/colors/my-colors';
import { withDelay } from '../../../lib/withDelay';

const TAG = 'atakPyk';

export function setupAtakPyk(api: PluginApi): () => void {
  let enabled = false;
  let onCooldown = false;
  let cooldownTimer: ReturnType<typeof setTimeout> | null = null;

  const colorInfo = api.colors.fromHex('#888888');

  const say = (text: string) => {
    const buf = new api.AnsiAwareBuffer();
    buf.append(text, colorInfo);
    api.output.print(buf);
  };

  const footer = api.ui.registerFooterComponent(
    'pyk',
    `<span style="color: ${col13}; font-weight: bold; margin-left: 8px;">PYK+ </span>`,
    'start',
  );
  footer.setVisible(false);

  const idPlus = api.aliases.register(/^pyk\+$/i, () => {
    enabled = true;
    footer.setVisible(true);
    say('--> pyk');
    return true;
  });

  const idMinus = api.aliases.register(/^pyk-$/i, () => {
    enabled = false;
    footer.setVisible(false);
    if (cooldownTimer) {
      clearTimeout(cooldownTimer);
      cooldownTimer = null;
    }
    onCooldown = false;
    say('--> juz nie pyk');
    return true;
  });

  const handleCelAtaku = (line: InstanceType<typeof api.AnsiAwareBuffer>) => {
    if (!enabled || onCooldown) return line;

    withDelay(211, 3187, () => {
      if (!enabled) return;
      api.command.send('/z', false);
      onCooldown = true;
      const cooldownSec = 10 + Math.floor(Math.random() * 4); // 10–13 s
      cooldownTimer = setTimeout(() => {
        onCooldown = false;
        cooldownTimer = null;
      }, cooldownSec * 1000);
    });

    return line;
  };

  api.triggers.register(/CEL ATT.*jako CEL ATAKU/, handleCelAtaku, TAG);
  api.triggers.register(/^.*wskazuje .* jako cel ataku\.$/, handleCelAtaku, TAG);

  return () => {
    if (cooldownTimer) clearTimeout(cooldownTimer);
    api.triggers.removeByTag(TAG);
    api.aliases.remove(idPlus);
    api.aliases.remove(idMinus);
    footer.remove();
  };
}
