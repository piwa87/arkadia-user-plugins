import type { PluginApi } from '@arkadia/plugin-types';
import { col3, col13 } from '../../lib/colors/my-colors';
import { withDelay } from '../../lib/withDelay';

const TAG = 'atakPyk';
const LEADER_WARN_INTERVAL = 5000;

export function setupAtakPyk(api: PluginApi): () => void {
  let enabled = false;
  let onCooldown = false;
  let cooldownTimer: ReturnType<typeof setTimeout> | null = null;

  const colorInfo = api.colors.fromHex('#888888');
  const subtleColor = api.colors.fromHex(col3);

  let leaderActiveTargetId: number | undefined;
  let leaderLastWarnAt = 0;

  // True when our avatar is already attacking the team's designated target.
  const isFightingTeamTarget = (): boolean => {
    const objects = api.objects.getObjectsOnLocation();
    const me = objects.find((o) => o.__category === 'player');
    if (!me || typeof me.attack_num !== 'number') return false;
    const teamTargetId =
      leaderActiveTargetId ?? objects.find((o) => o.attack_target === true)?.num;
    return teamTargetId != null && me.attack_num === teamTargetId;
  };

  const sendAttack = () => {
    if (onCooldown) return;
    withDelay(211, 3187, () => {
      if (!enabled) return;
      if (isFightingTeamTarget()) return;
      api.command.send('/z', false);
      onCooldown = true;
      const cooldownSec = 10 + Math.floor(Math.random() * 4); // 10–13 s
      cooldownTimer = setTimeout(() => {
        onCooldown = false;
        cooldownTimer = null;
      }, cooldownSec * 1000);
    });
  };

  const printSubtleWarning = () => {
    const now = Date.now();
    if (now - leaderLastWarnAt < LEADER_WARN_INTERVAL) return;
    leaderLastWarnAt = now;
    api.output.print(new api.AnsiAwareBuffer().append('     nie bijesz celu ataku', subtleColor));
  };

  const onLeaderTargetNoAvatar = (id: number) => {
    leaderActiveTargetId = id;
    if (enabled) {
      sendAttack();
    } else {
      printSubtleWarning();
    }
  };

  const onLeaderTargetAvatar = () => {
    leaderActiveTargetId = undefined;
    leaderLastWarnAt = 0;
  };

  const onObjectsData = () => {
    if (!leaderActiveTargetId || enabled) return;
    printSubtleWarning();
  };

  api.events.on('teamLeaderTargetNoAvatar', onLeaderTargetNoAvatar);
  api.events.on('teamLeaderTargetAvatar', onLeaderTargetAvatar);
  api.events.on('gmcp.objects.data', onObjectsData);

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
    if (!enabled) return line;
    sendAttack();
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
    api.events.off('teamLeaderTargetNoAvatar', onLeaderTargetNoAvatar);
    api.events.off('teamLeaderTargetAvatar', onLeaderTargetAvatar);
    api.events.off('gmcp.objects.data', onObjectsData);
  };
}
