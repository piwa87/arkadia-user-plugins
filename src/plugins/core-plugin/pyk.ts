import type { PluginApi } from '@arkadia/plugin-types';
import { col13 } from '../../lib/colors/my-colors';
import { registerTokenGate } from '../../lib/registerTokenGate';

const TAG = 'atakPyk';

const SESSION_MS = 15 * 60 * 1000;

// All automatic attack sources share this session, pending reaction and cooldown.
let controller: { isEnabled: () => boolean; request: () => void } | null = null;

export function isPykEnabled(): boolean {
  return controller?.isEnabled() ?? false;
}

export function requestPykAttack(): void {
  controller?.request();
}

export function setupAtakPyk(api: PluginApi): () => void {
  let enabledUntil = 0;
  let nextAttackAt = 0;
  let reactionTimer: ReturnType<typeof setTimeout> | null = null;
  let expiryTimer: ReturnType<typeof setTimeout> | null = null;
  let wieldTimer: ReturnType<typeof setTimeout> | null = null;
  let recoveringWeapon = false;
  let wieldAttempted = false;

  const colorInfo = api.colors.fromHex('#888888');

  const cancelReaction = () => {
    if (reactionTimer !== null) clearTimeout(reactionTimer);
    reactionTimer = null;
  };

  const resetWeaponRecovery = () => {
    if (wieldTimer !== null) clearTimeout(wieldTimer);
    wieldTimer = null;
    recoveringWeapon = false;
    wieldAttempted = false;
  };

  const disable = () => {
    enabledUntil = 0;
    cancelReaction();
    resetWeaponRecovery();
    if (expiryTimer !== null) clearTimeout(expiryTimer);
    expiryTimer = null;
    footer.setVisible(false);
    nextAttackAt = 0;
  };

  const isEnabled = () => {
    if (enabledUntil === 0) return false;
    // Background tabs can delay timers; never send after the wall-clock deadline.
    if (Date.now() >= enabledUntil) {
      disable();
      say('--> juz nie pyk (minelo 15 minut)');
      return false;
    }
    return true;
  };

  const sendAttack = () => {
    if (!isEnabled() || recoveringWeapon || reactionTimer !== null || Date.now() < nextAttackAt) return;
    reactionTimer = setTimeout(() => {
      reactionTimer = null;
      if (!isEnabled() || recoveringWeapon || Date.now() < nextAttackAt) return;

      // The marked target is authoritative, even when the leader fights someone
      // else. Resolve it at execution time, after text and GMCP have caught up.
      const leaderId = api.team.getLeaderId();
      const objects = api.objects.getObjectsOnLocation();
      const me = objects.find(o => o.__category === 'player');
      const target = objects.find(o => o.attack_target === true);
      if (!me || leaderId == null || leaderId === me.num || !target ||
          target.__category === 'player' || target.__category === 'team' ||
          me.attack_num === target.num) return;

      // Reserve before sending, including synchronous events caused by send().
      nextAttackAt = Date.now() + (7 + Math.floor(Math.random() * 5)) * 1000;
      api.command.send('/z', false);
    }, 400 + Math.floor(Math.random() * 3001));
  };

  const session = { isEnabled, request: sendAttack };
  controller = session;

  const onWeaponKnockedOff = () => {
    if (!isEnabled()) return;
    cancelReaction();
    resetWeaponRecovery();
    recoveringWeapon = true;
  };

  const onCanWield = () => {
    if (!isEnabled() || !recoveringWeapon || wieldAttempted || wieldTimer !== null) return;
    wieldTimer = setTimeout(() => {
      wieldTimer = null;
      if (!isEnabled() || !recoveringWeapon || wieldAttempted) return;
      // One attempt per knock-off, independent of attack cooldown. Keep attacks
      // suspended until the client confirms a weapon is in hand (no retries).
      wieldAttempted = true;
      api.command.send('dob');
    }, 400 + Math.floor(Math.random() * 3001));
  };

  const onWeaponState = (drawn: boolean) => {
    if (drawn) resetWeaponRecovery();
  };

  api.events.on('teamLeaderTargetNoAvatar', sendAttack);
  api.events.on('weaponKnockedOff', onWeaponKnockedOff);
  api.events.on('canWieldAfterKnockOff', onCanWield);
  api.events.on('weapon_state', onWeaponState);
  api.events.on('mapMove', cancelReaction);
  api.events.on('client.disconnect', disable);

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
    enabledUntil = Date.now() + SESSION_MS;
    if (expiryTimer !== null) clearTimeout(expiryTimer);
    expiryTimer = setTimeout(() => { isEnabled(); }, SESSION_MS);
    footer.setVisible(true);
    say('--> pyk');
    return true;
  });

  const idMinus = api.aliases.register(/^pyk-$/i, () => {
    disable();
    say('--> juz nie pyk');
    return true;
  });

  const handleCelAtaku = (line: InstanceType<typeof api.AnsiAwareBuffer>) => {
    sendAttack();
    return line;
  };

  registerTokenGate(
    api,
    ['att', 'wskazuje'],
    [/CEL ATT.*jako CEL ATAKU/, /^.*wskazuje .* jako cel ataku\.$/],
    handleCelAtaku,
    TAG,
  );

  return () => {
    disable();
    if (controller === session) controller = null;
    api.triggers.removeByTag(TAG);
    api.aliases.remove(idPlus);
    api.aliases.remove(idMinus);
    footer.remove();
    api.events.off('teamLeaderTargetNoAvatar', sendAttack);
    api.events.off('weaponKnockedOff', onWeaponKnockedOff);
    api.events.off('canWieldAfterKnockOff', onCanWield);
    api.events.off('weapon_state', onWeaponState);
    api.events.off('mapMove', cancelReaction);
    api.events.off('client.disconnect', disable);
  };
}
