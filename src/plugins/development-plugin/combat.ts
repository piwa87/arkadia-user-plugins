import type { PluginApi } from '@arkadia/plugin-types';
import { registerDev } from './devAlias';

export function setupCmudCombatAliases(api: PluginApi): void {
  // 11–99: attack enemy at GMCP position N (light attack)
  // 111–999: kill enemy at position N (full-force)
  for (let n = 1; n <= 9; n++) {
    registerDev(
      api,
      new RegExp(`^${n}${n}$`),
      `${n}${n}`,
      () => {
        const enemies = api.objects.getObjectsOnLocation().filter(o => o.__category === 'rest');
        const t = enemies[n - 1];
        return t ? `atakuj wroga #${n}: ${t.desc ?? `ob_${t.num}`}` : `atakuj wroga #${n} (brak celu)`;
      },
      () => {
        const enemies = api.objects.getObjectsOnLocation().filter(o => o.__category === 'rest');
        const target = enemies[n - 1];
        if (target) {
          api.attackController.attackById(target.num, api.attackController.getAttackCommand());
        }
        return true;
      },
    );

    registerDev(
      api,
      new RegExp(`^${n}${n}${n}$`),
      `${n}${n}${n}`,
      () => {
        const enemies = api.objects.getObjectsOnLocation().filter(o => o.__category === 'rest');
        const t = enemies[n - 1];
        return t ? `ZABIJ wroga #${n}: ${t.desc ?? `ob_${t.num}`}` : `zabij wroga #${n} (brak celu)`;
      },
      () => {
        const enemies = api.objects.getObjectsOnLocation().filter(o => o.__category === 'rest');
        const target = enemies[n - 1];
        if (target) {
          api.attackController.attackById(target.num, 'zabij');
        }
        return true;
      },
    );
  }

  // q → backstab current attack target
  registerDev(api, /^q$/i, 'q', () => {
    const [id] = api.attackQueue.get();
    return id !== undefined ? `zaskok ob_${id}` : 'zaskok (brak celu w kolejce)';
  }, () => {
    const [targetId] = api.attackQueue.get();
    if (targetId !== undefined) api.command.send(`zaskok ob_${targetId}`, false);
    return true;
  });

  // v → finish off current attack target
  registerDev(api, /^v$/i, 'v', () => {
    const [id] = api.attackQueue.get();
    return id !== undefined ? `dobij ob_${id}` : 'dobij (brak celu)';
  }, () => {
    const [targetId] = api.attackQueue.get();
    if (targetId !== undefined) api.command.send(`dobij ob_${targetId}`, false);
    return true;
  });

  // b → block current attack target
  registerDev(api, /^b$/i, 'b', () => {
    const [id] = api.attackQueue.get();
    return id !== undefined ? `zablokuj ob_${id}` : 'zablokuj (brak celu)';
  }, () => {
    const [targetId] = api.attackQueue.get();
    if (targetId !== undefined) api.command.send(`zablokuj ob_${targetId}`, false);
    return true;
  });

  // bb → order whole party to block current target
  registerDev(api, /^bb$/i, 'bb', () => {
    const [id] = api.attackQueue.get();
    return id !== undefined ? `rozkaz: zablokuj ob_${id}` : 'rozkaz zablokuj (brak celu)';
  }, () => {
    const [targetId] = api.attackQueue.get();
    if (targetId !== undefined) api.command.send(`rozkaz druzynie zablokuj ob_${targetId}`, false);
    return true;
  });

  // vv → stop shielding
  registerDev(api, /^vv$/i, 'vv', 'zaprzestań zasłaniania', () => {
    api.command.send('zaprzestan zaslon', false);
    return true;
  });

  // zp <name> → shield named party member
  registerDev(
    api,
    /^zp\s+(.+)$/i,
    'zp <imię>',
    (m) => `zasłoń: ${m?.[1]?.trim() ?? '?'}`,
    (matches) => {
      const name = matches?.[1]?.trim();
      if (name) api.command.send(`zaslon ${name}`, false);
      return true;
    },
  );

  // zp1–zp5 → shield team member at slot N
  for (let n = 1; n <= 5; n++) {
    registerDev(
      api,
      new RegExp(`^zp${n}$`, 'i'),
      `zp${n}`,
      () => {
        const name = api.team.getMembers()[n - 1];
        return name ? `zasłoń drużyna[${n}]: ${name}` : `zasłoń drużyna[${n}] (brak)`;
      },
      () => {
        const name = api.team.getMembers()[n - 1];
        if (name) api.command.send(`zaslon ${name}`, false);
        return true;
      },
    );
  }

  // cca → order party to attack current queued target
  registerDev(api, /^cca$/i, 'cca', () => {
    const [id] = api.attackQueue.get();
    return id !== undefined ? `rozkaz: zaatakuj ob_${id}` : 'rozkaz zaatakuj (szuka pierwszego wroga)';
  }, () => {
    const queue = api.attackQueue.get();
    const targetId = queue[0];
    if (targetId !== undefined) {
      api.command.send(`rozkaz druzynie zaatakowac ob_${targetId}`, false);
    } else {
      const enemies = api.objects.getObjectsOnLocation().filter(o => o.__category === 'rest');
      if (enemies[0]) {
        api.attackController.attackById(enemies[0].num);
        api.command.send(`rozkaz druzynie zaatakowac ob_${enemies[0].num}`, false);
      }
    }
    return true;
  });

  // dp → queue enemies in reverse priority (4→3→2→1), attack first queued
  registerDev(api, /^dp$/i, 'dp', () => {
    const count = api.objects.getObjectsOnLocation().filter(o => o.__category === 'rest').length;
    return `kolejka odwrócona — ${count} wrogów`;
  }, () => {
    const enemies = api.objects.getObjectsOnLocation().filter(o => o.__category === 'rest');
    api.attackQueue.clear();
    for (let i = enemies.length - 1; i >= 0; i--) {
      api.attackQueue.add(enemies[i].num);
    }
    const queue = api.attackQueue.get();
    if (queue[0] !== undefined) api.attackController.attackById(queue[0]);
    return true;
  });

  // bd → batch: add all GMCP enemies to queue and attack the first
  registerDev(api, /^bd$/i, 'bd', () => {
    const count = api.objects.getObjectsOnLocation().filter(o => o.__category === 'rest').length;
    return `batch atak — ${count} wrogów do kolejki`;
  }, () => {
    const enemies = api.objects.getObjectsOnLocation().filter(o => o.__category === 'rest');
    api.attackQueue.clear();
    for (const e of enemies) api.attackQueue.add(e.num);
    if (enemies[0]) api.attackController.attackById(enemies[0].num);
    return true;
  });

  // wsk <name> → designate named target as attack target
  registerDev(
    api,
    /^wsk\s+(.+)$/i,
    'wsk <imię>',
    (m) => `wskaż cel: ${m?.[1]?.trim() ?? '?'}`,
    (matches) => {
      const name = matches?.[1]?.trim();
      if (name) api.command.send(`wskaz ${name} jako cel ataku`, false);
      return true;
    },
  );

  // bbb → attack current target + order party to block it
  registerDev(api, /^bbb$/i, 'bbb', () => {
    const [id] = api.attackQueue.get();
    return id !== undefined ? `atak + rozkaz zablokuj ob_${id}` : 'bbb (brak celu)';
  }, () => {
    const [targetId] = api.attackQueue.get();
    if (targetId !== undefined) {
      api.attackController.attackById(targetId);
      api.command.send(`rozkaz druzynie zablokuj ob_${targetId}`, false);
    }
    return true;
  });
}
