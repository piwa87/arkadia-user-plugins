import type { PluginApi } from '@arkadia/plugin-types';

interface FoodItem {
  pattern: RegExp;
  command: string;
}

const FOOD_ITEMS: FoodItem[] = [
  { pattern: /duza, porcelanowa waza wypelniona zupa Le Virtu/, command: 'poczestuj sie zupa' },
  { pattern: /duzy talerz zajety przez okragla pizze, pelna najrozniejszych owocow morza/, command: 'poczestuj sie pizza' },
  { pattern: /ogromna micha z zawsze goracym, parujacym makaronem/, command: 'poczestuj sie makaronem' },
  { pattern: /ogromna micha z zawsze goracym, parujacym spaghetti bolognese/, command: 'poczestuj sie makaronem' },
  { pattern: /ogromna micha z zawsze goracym, parujacym spaghetti z sosem genuenskim/, command: 'poczestuj sie makaronem' },
  { pattern: /ogromna micha z zawsze goracym, parujacym spaghetti, ktore cale pokryte jest zolta, gesta masa/, command: 'poczestuj sie makaronem' },
  { pattern: /spory polmisek wypelniony malutkimi, kwadratowymi pierozkami ravioli/, command: 'poczestuj sie pierozkami' },
  { pattern: /spory talerz pelen malych, przyrzadzonych z wielka dbaloscia o walory estetyczne, tartinek/, command: 'poczestuj sie tartinka' },
  { pattern: /spory talerz pelen niezwykle intensywnie pachnacych maslanych buleczek ulozonych w zgrabny stosik/, command: 'poczestuj sie buleczka' },
  { pattern: /spory talerz pelen pysznej pizzy Campogrotta/, command: 'poczestuj sie pizza' },
  { pattern: /spory talerz pelen pysznej pizzy Miragliano/, command: 'poczestuj sie pizza' },
  { pattern: /spory talerz pelen pysznej szarlotki posypanej cukrem pudrem/, command: 'poczestuj sie szarlotka' },
  { pattern: /polmisek zawierajacy aromatycznego, pieczonego pstraga z makaronem/, command: 'poczestuj sie pstragiem' },
  { pattern: /misa pelna parujacego makaronu i ustawia ja na stole/, command: 'poczestuj sie makaronem' },
  { pattern: /brytfanka na drewnianej podstawce, zawierajaca goraca lasagne pokryta warstwa spieczonego sera/, command: 'poczestuj sie lasagne' },
];

const FULL_PATTERNS: RegExp[] = [
  /przelknac ani .* wiecej/,
  /Spostrzegasz, ze oproznil.s juz caly talerz/,
  /jednak jestes tak najedzon./,
  /jednak jestes juz tak najedzon./,
];

const DRINKING_PATTERN = /Napelniasz szklanke woda z dzbana, zblizasz do ust i wypijasz\./;
const FULL_DRINK_PATTERN = /Nie jestes w stanie wmusic w siebie ani lyka wiecej\./;

const ROOM_FOOD_PATTERNS: RegExp[] = [
  /Na srodku stolu stoi/,
  /Centralne miejsce stolu zajmuje/,
  /Do pomieszczenia wchodzi dziewka sluzebna z nowa/,
];

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

export function setupDining(api: PluginApi): () => void {
  const tag = 'ra:dining';
  let active = false;
  let cleanupTimeout: NodeJS.Timeout | null = null;

  function resetCleanupTimeout(ms = 10000): void {
    if (cleanupTimeout) {
      clearTimeout(cleanupTimeout);
    }
    cleanupTimeout = setTimeout(() => stopEating(), ms);
  }

  function stopEating(): void {
    if (!active) return;
    active = false;
    api.triggers.removeByTag(tag);
    if (cleanupTimeout) {
      clearTimeout(cleanupTimeout);
      cleanupTimeout = null;
    }
  }

  function eatFood(command: string): void {
    resetCleanupTimeout();
    api.command.send('usiadz przy stole');
    api.command.send(command);
  }

  api.aliases.register(/^\/jadalnia_ra$/, () => {
    if (active) {
      stopEating();
    }
    active = true;

    for (const roomPattern of ROOM_FOOD_PATTERNS) {
      const parent = api.triggers.register(
        roomPattern,
        (line) => line,
        tag,
        { stayOpenLines: 20 }
      );

      for (const food of FOOD_ITEMS) {
        parent.registerChild(
          food.pattern,
          (line: any) => {
            eatFood(food.command);
            return line;
          },
          tag
        );
      }
    }

    for (const pattern of FULL_PATTERNS) {
      api.triggers.registerOneTime(
        pattern,
        (line) => {
          resetCleanupTimeout(30000);
          api.bind.set('poczestuj sie woda');
          cecho(api, `<yellow>Najedzona/y! Wcisnij [${api.bind.getLabel()}] aby pic wode.\n`);
          return line;
        },
        tag
      );
    }

    api.triggers.register(
      DRINKING_PATTERN,
      (line) => {
        resetCleanupTimeout();
        api.command.send('poczestuj sie woda');
        return line;
      },
      tag
    );

    api.triggers.register(
      FULL_DRINK_PATTERN,
      (line) => {
        stopEating();
        api.bind.set('wstan');
        return line;
      },
      tag
    );

    setTimeout(() => {
      if (active) {
        api.command.send('spojrz');
      }
    }, 100);

    resetCleanupTimeout();
    cecho(api, '<yellow>Szukam jedzenia w jadalni...\n');
    return true;
  });

  return () => {
    stopEating();
  };
}
