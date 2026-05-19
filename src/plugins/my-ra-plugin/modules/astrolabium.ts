import type { PluginApi } from '@arkadia/plugin-types';

const CONSTELLATIONS: Record<string, Record<string, string>> = {
  czlowiek: {
    'wielki dab': 'Zloty Smok',
    'tartak': 'Prawda',
    'wilka': 'Studia Wiedzy',
    'dorodnego konia': 'Wieszcz Dobrej Nowiny',
    'scene z polowania': 'Wlocznia',
    'mlynskie kolo': 'Dziki Wilk',
    'skorpiona': 'Dzban',
    'rybe': 'Siedem Koz',
    'wage': 'Srebrna Tarcza',
    'bobra': 'Dzwonnik',
    'wscieklego psa': 'Naga Luczniczka',
    'barke': 'Dziki Zubr',
    'dzika': 'Jednorozec',
    'borsuka': 'Kaplanka',
    'farme': 'Letnia Panna',
    'drwala przy wyrebie': 'Lisc Debu',
    'ognisko': 'Oko',
    'miecz': 'Wielka Kozica',
    'rohatyne': 'Bialy Kon'
  },
  gnom: {
    'wulkan': 'Zloty Smok',
    'rurke': 'Prawda',
    'powywijany drucik': 'Studia Wiedzy',
    'tube': 'Wieszcz Dobrej Nowiny',
    'prosty trybik': 'Wlocznia',
    'mlynskie kolo': 'Dziki Wilk',
    'klepsydre': 'Dzban',
    'rybe': 'Siedem Koz',
    'szmaragd': 'Srebrna Tarcza',
    'line': 'Dzwonnik',
    'gora': 'Naga Luczniczka',
    'mlot': 'Dziki Zubr',
    'zabiegana gnomke': 'Jednorozec',
    'borsuka': 'Kaplanka',
    'soczewke': 'Letnia Panna',
    'skomplikowana machine': 'Lisc Debu',
    'ognisko': 'Oko',
    'kompas': 'Wielka Kozica',
    'rohatyne': 'Bialy Kon'
  },
  polelf: {
    'lisc': 'Zloty Smok',
    'flet': 'Prawda',
    'lire': 'Studia Wiedzy',
    'tube': 'Wieszcz Dobrej Nowiny',
    'prosty trybik': 'Wlocznia',
    'mlynskie kolo': 'Dziki Wilk',
    'szafir': 'Dzban',
    'rybe': 'Siedem Koz',
    'driade': 'Srebrna Tarcza',
    'smukly luk': 'Dzwonnik',
    'jednorozca': 'Naga Luczniczka',
    'lesne jezioro': 'Dziki Zubr',
    'zgrabnego konia': 'Jednorozec',
    'oko': 'Kaplanka',
    'soczewke': 'Letnia Panna',
    'orla': 'Zimowa Panna',
    'prastary las': 'Lisc Debu',
    'ognisko': 'Oko',
    'lutnie': 'Wielka Kozica',
    'rohatyne': 'Bialy Kon'
  }
};

const DIRECTIONS = ['polnoc', 'wschod', 'poludnie', 'zachod'];

interface TelescopeState {
  currentDirection: string;
  directionConstellations: Record<string, string[]>;
  race: string;
}

function createTelescopeState(): TelescopeState {
  return {
    currentDirection: '',
    directionConstellations: {
      polnoc: [],
      wschod: [],
      poludnie: [],
      zachod: []
    },
    race: 'czlowiek'
  };
}

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

function showConstellations(api: PluginApi, telescope: TelescopeState): void {
  for (const direction of DIRECTIONS) {
    const constellations = telescope.directionConstellations[direction];
    if (constellations.length > 0) {
      cecho(
        api,
        `\n<green>Gwiazdozbiory w kierunku <yellow>${direction.toUpperCase()}<grey>: <tomato>${constellations.join(', ')}`
      );
    }
  }
  cecho(api, '\n');
}

export function setupAstrolabium(api: PluginApi): () => void {
  const tag = 'ra:astrolabium';
  const telescope = createTelescopeState();

  try {
    const charRace = api.gmcp.get()?.char?.info?.race || '';
    if (charRace && CONSTELLATIONS[charRace]) {
      telescope.race = charRace;
    }
  } catch {}

  api.triggers.register(
    /Jest teraz skierowany na\s+(\w+)\./,
    (line) => {
      const matches = line.text.match(/Jest teraz skierowany na\s+(\w+)\./);
      if (matches?.[1]) {
        const direction = matches[1].trim().toLowerCase();
        if (DIRECTIONS.includes(direction)) {
          telescope.currentDirection = direction;
        }
      }
      return line;
    },
    tag
  );

  api.triggers.register(
    /gwiazdozbior przypominajacy (.+?)(?:\.|,| poza tym| natomiast| oraz)/,
    (line) => {
      const matches = line.text.match(/gwiazdozbior przypominajacy (.+?)(?:\.|,| poza tym| natomiast| oraz)/);
      if (matches?.[1] && telescope.currentDirection) {
        const pattern = matches[1].trim();
        const raceConstellations = CONSTELLATIONS[telescope.race] || CONSTELLATIONS['czlowiek'];
        const constellationName = raceConstellations[pattern];
        if (constellationName) {
          if (!telescope.directionConstellations[telescope.currentDirection]) {
            telescope.directionConstellations[telescope.currentDirection] = [];
          }
          if (!telescope.directionConstellations[telescope.currentDirection].includes(constellationName)) {
            telescope.directionConstellations[telescope.currentDirection].push(constellationName);
          }
        }
      }
      return line;
    },
    tag
  );

  api.triggers.register(
    /gwiazdozbior przypominajacy ([^.]+)/,
    (line) => {
      return line;
    },
    tag
  );

  api.triggers.register(
    /Pokretlo podpisane DZIEN zostalo ustawione na wartosc (\d+)/,
    (line) => {
      const matches = line.text.match(/Pokretlo podpisane DZIEN zostalo ustawione na wartosc (\d+)/);
      if (matches?.[1]) {
        cecho(api, `\n<gold>Astrolabium DZIEN: ${matches[1]}\n`);
      }
      return line;
    },
    tag
  );

  api.triggers.register(
    /Pokretlo podpisane GODZINA zostalo ustawione na wartosc (\d+)/,
    (line) => {
      const matches = line.text.match(/Pokretlo podpisane GODZINA zostalo ustawione na wartosc (\d+)/);
      if (matches?.[1]) {
        cecho(api, `\n<gold>Astrolabium GODZINA: ${matches[1]}\n`);
      }
      return line;
    },
    tag
  );

  api.aliases.register(/^\/teleskop$/, () => {
    let hasAny = false;
    for (const dir of DIRECTIONS) {
      if (telescope.directionConstellations[dir].length > 0) {
        hasAny = true;
        break;
      }
    }
    if (!hasAny) {
      cecho(api, '\n<yellow>Brak rozpoznanych gwiazdozbiorow. Uzyj teleskopu, aby obserwowac niebo.\n');
      return true;
    }
    cecho(api, '\n<yellow>Rozpoznane gwiazdozbiory:\n');
    showConstellations(api, telescope);
    return true;
  });

  api.aliases.register(/^\/teleskop_sprawdz$/, () => {
    for (const dir of DIRECTIONS) {
      telescope.directionConstellations[dir] = [];
    }
    cecho(api, '\n<yellow>Rozpoczynam sprawdzanie gwiazdozbiorow...\n');
    api.command.send('wejdz na podest');
    for (const direction of DIRECTIONS) {
      api.command.send(`obroc teleskop na ${direction}`);
      api.command.send('popatrz przez teleskop');
    }
    api.command.send('zejdz z podestu');
    return true;
  });

  api.aliases.register(/^\/ustaw_astrolabium$/, () => {
    let hasAny = false;
    for (const dir of DIRECTIONS) {
      if (telescope.directionConstellations[dir].length > 0) {
        hasAny = true;
        break;
      }
    }
    if (!hasAny) {
      cecho(api, '\n<yellow>Brak rozpoznanych gwiazdozbiorow. Najpierw uzyj /teleskop_sprawdz.\n');
      return true;
    }
    cecho(api, '\n<yellow>Ustawiam astrolabium...\n');
    for (const direction of DIRECTIONS) {
      for (const constellation of telescope.directionConstellations[direction]) {
        api.command.send(`ustaw gwiazdozbior ${constellation} na astrolabium na ${direction}`);
      }
    }
    cecho(api, '\n<green>Astrolabium zostalo ustawione.\n');
    return true;
  });

  api.aliases.register(/^\/ustaw_rase\s+(.+)$/, (matches: any) => {
    const race = matches?.[1]?.trim().toLowerCase() || '';
    if (CONSTELLATIONS[race]) {
      telescope.race = race;
      cecho(api, `\n<green>Ustawiono rase na: ${race}\n`);
    } else {
      const available = Object.keys(CONSTELLATIONS).join(', ');
      cecho(api, `\n<yellow>Nieznana rasa: ${race}. Dostepne: ${available}\n`);
    }
    return true;
  });

  return () => {
    api.triggers.removeByTag(tag);
  };
}
