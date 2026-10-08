import type { PluginApi } from '@arkadia/plugin-types';
import { col13 } from '../../../lib/colors/my-colors';
import { renderFooterChip } from '../../../lib/footerChip';
import { registerTokenGate } from '../../../lib/registerTokenGate';
import { setupPykCover } from './cover';

const TAG = 'atakPyk';

const SESSION_MS = 15 * 60 * 1000;
const REACTION_MIN_MS = 400;
const REACTION_MAX_MS = 3400;
const COOLDOWN_MIN_SECONDS = 7;
const COOLDOWN_MAX_SECONDS = 11;
const WEAPON_CONFIRMATION_MS = 10000;
const DRAW_COMMAND = /^(?:dob|dobm|dobmc|dobt|dobs|dobny|db|db_m|db_t|db_mac|db_mt|db_mmac|chdobadz|gzdobadz|scdobadz|podobadz|dobadz)(?:\s|$)/i;

type WeaponRecovery = 'idle' | 'waitingForReady' | 'scheduled' | 'waitingForConfirmation';

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const reactionDelay = () => randomInt(REACTION_MIN_MS, REACTION_MAX_MS);

// All automatic attack sources share this session, pending reaction and cooldown.
let controller: { isEnabled: () => boolean; request: () => void; stop: () => void } | null = null;

export function isPykEnabled(): boolean {
  return controller?.isEnabled() ?? false;
}

export function requestPykAttack(): void {
  controller?.request();
}

/** Shared explicit stop for pyk- and prr; no command dispatch needed. */
export function stopPyk(): void {
  controller?.stop();
}

export function setupAtakPyk(api: PluginApi): () => void {
  let enabledUntil = 0;
  let nextAttackAt = 0;
  let reactionTimer: ReturnType<typeof setTimeout> | null = null;
  let expiryTimer: ReturnType<typeof setTimeout> | null = null;
  let wieldTimer: ReturnType<typeof setTimeout> | null = null;
  let weaponRecovery: WeaponRecovery = 'idle';
  let confirmationTimer: ReturnType<typeof setTimeout> | null = null;

  const colorInfo = api.colors.fromHex('#888888');

  const cancelReaction = () => {
    if (reactionTimer !== null) clearTimeout(reactionTimer);
    reactionTimer = null;
  };

  const resetWeaponRecovery = () => {
    if (wieldTimer !== null) clearTimeout(wieldTimer);
    wieldTimer = null;
    if (confirmationTimer !== null) clearTimeout(confirmationTimer);
    confirmationTimer = null;
    weaponRecovery = 'idle';
  };

  const disable = () => {
    enabledUntil = 0;
    cancelReaction();
    resetWeaponRecovery();
    cover.reset();
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

  const cover = setupPykCover(api, isEnabled, reactionDelay);

  const requestAttack = () => {
    if (!isEnabled() || weaponRecovery !== 'idle' || reactionTimer !== null || Date.now() < nextAttackAt) return;
    reactionTimer = setTimeout(() => {
      reactionTimer = null;
      if (!isEnabled() || weaponRecovery !== 'idle' || Date.now() < nextAttackAt) return;

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
      nextAttackAt = Date.now() + randomInt(COOLDOWN_MIN_SECONDS, COOLDOWN_MAX_SECONDS) * 1000;
      api.command.send('/z', false);
    }, reactionDelay());
  };

  const stop = () => {
    disable();
    say('--> juz nie pyk');
  };

  const session = { isEnabled, request: requestAttack, stop };
  controller = session;

  const onWeaponKnockedOff = () => {
    if (!isEnabled()) return;
    cancelReaction();
    resetWeaponRecovery();
    weaponRecovery = 'waitingForReady';
  };

  const waitForWeaponConfirmation = () => {
    if (wieldTimer !== null) clearTimeout(wieldTimer);
    wieldTimer = null;
    weaponRecovery = 'waitingForConfirmation';
    confirmationTimer = setTimeout(() => {
      confirmationTimer = null;
      if (!isEnabled() || weaponRecovery !== 'waitingForConfirmation') return;
      say('--> pyk: brak potwierdzenia dobycia broni; autoatak wstrzymany');
    }, WEAPON_CONFIRMATION_MS);
  };

  const onCanWield = () => {
    if (!isEnabled() || weaponRecovery !== 'waitingForReady') return;
    weaponRecovery = 'scheduled';
    wieldTimer = setTimeout(() => {
      wieldTimer = null;
      if (!isEnabled() || weaponRecovery !== 'scheduled') return;
      // Change state before sending: our own dob and its expanded commands must
      // not be treated as a new manual attempt by the command hook below.
      waitForWeaponConfirmation();
      api.command.send('dob');
    }, reactionDelay());
  };

  const drawHookId = api.commandHooks.register((command: string) => {
    // An attempt before readiness may be rejected by the game. Keep waiting
    // for readiness; a successful weapon_state confirmation still cancels recovery.
    if (weaponRecovery === 'scheduled' && DRAW_COMMAND.test(command.trim()) && isEnabled()) {
      // A user alias, functional bind or another module takes over drawing.
      // Keep attacks blocked until confirmation; do not retry or repeat warnings.
      waitForWeaponConfirmation();
    }
    return undefined;
  });

  const onWeaponState = (drawn: boolean) => {
    if (drawn) resetWeaponRecovery();
  };

  api.events.on('teamLeaderTargetNoAvatar', requestAttack);
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
    renderFooterChip({ value: 'PYK', valueColor: col13 }),
    'start',
  );
  footer.setVisible(false);

  const idPlus = api.aliases.register(/^pyk\+$/i, () => {
    enabledUntil = Date.now() + SESSION_MS;
    if (expiryTimer !== null) clearTimeout(expiryTimer);
    expiryTimer = setTimeout(() => { isEnabled(); }, SESSION_MS);
    footer.setVisible(true);
    say('--> pyk');
    cover.request();
    return true;
  });

  const idMinus = api.aliases.register(/^pyk-$/i, () => {
    stop();
    return true;
  });

  const handleCelAtaku = (line: InstanceType<typeof api.AnsiAwareBuffer>) => {
    requestAttack();
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
    cover.destroy();
    if (controller === session) controller = null;
    api.triggers.removeByTag(TAG);
    api.aliases.remove(idPlus);
    api.aliases.remove(idMinus);
    footer.remove();
    api.commandHooks.unregister(drawHookId);
    api.events.off('teamLeaderTargetNoAvatar', requestAttack);
    api.events.off('weaponKnockedOff', onWeaponKnockedOff);
    api.events.off('canWieldAfterKnockOff', onCanWield);
    api.events.off('weapon_state', onWeaponState);
    api.events.off('mapMove', cancelReaction);
    api.events.off('client.disconnect', disable);
  };
}
