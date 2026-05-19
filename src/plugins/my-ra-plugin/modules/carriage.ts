import type { PluginApi } from '@arkadia/plugin-types';

interface CarriageData {
  speed_samples: number[];
  rental_cost: string;
  deposit: string;
  type: string;
  parking: string;
}

interface CarriageState {
  name: string;
  driveOn: boolean;
  starttime: number;
  houseId: string;
  showSpeed: boolean;
  enabled: boolean;
}

interface RaState {
  carriageData?: CarriageData | null;
}

function createCarriageState(): CarriageState {
  return {
    name: '',
    driveOn: false,
    starttime: 0,
    houseId: '',
    showSpeed: true,
    enabled: true,
  };
}

function getAverageSpeed(samples: number[]): number {
  if (samples.length < 2) return 0;
  let totalDiff = 0;
  for (let i = 1; i < samples.length; i++) {
    totalDiff += samples[i] - samples[i - 1];
  }
  const avgInterval = totalDiff / (samples.length - 1);
  if (avgInterval <= 0) return 0;
  return Math.round((60 / avgInterval) * 100) / 100;
}

function saveCarriageData(state: RaState): void {
  // Implement storage as needed
  // raStorage.set('carriage', state.carriageData);
}

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

export function setupCarriage(api: PluginApi, state: RaState): () => void {
  const tag = 'ra:carriage';
  const cs = createCarriageState();

  if (!state.carriageData) {
    state.carriageData = {
      speed_samples: [],
      rental_cost: '',
      deposit: '',
      type: '',
      parking: '',
    };
  }

  api.triggers.register(
    /^Wraz z (.*) jedziesz (.*) na (.*)\.$/,
    (line) => {
      if (cs.showSpeed && state.carriageData) {
        const now = Date.now() / 1000;
        state.carriageData.speed_samples.push(now);
        if (state.carriageData.speed_samples.length > 10) {
          state.carriageData.speed_samples.shift();
        }
        const speed = getAverageSpeed(state.carriageData.speed_samples);
        if (speed > 0) {
          cecho(api, `<ansiLightBlack> z szybkoscia ${speed} l/m`);
        }
      }
      cs.driveOn = true;
      return line;
    },
    tag
  );

  api.triggers.register(
    /^(.*) (woz|bryczka|dylizans) zatrzymuje sie\.$/,
    (line) => {
      cs.driveOn = false;
      if (state.carriageData) {
        state.carriageData.speed_samples = [];
      }
      return line;
    },
    tag
  );

  api.triggers.register(
    /^Zsiadasz z (.*) (wozu|bryczki|dylizansu)\.$/,
    (line) => {
      cecho(api, '\n\n<yellow>Obsluga pojazdu: <red>OFF\n');
      cs.driveOn = false;
      if (state.carriageData) {
        state.carriageData.speed_samples = [];
        const room = api.map.getRoom();
        if (room?.id) {
          state.carriageData.parking = String(room.id);
        }
        saveCarriageData(state);
      }
      return line;
    },
    tag
  );

  api.triggers.register(
    /^Wynajmujesz (.*) placac (.*) kosztu najmu (.*) kaucji\.$/,
    (line, matches) => {
      if (matches) {
        const vehicleType = matches[1] || '';
        const cost = matches[2] || '';
        const deposit = matches[3] || '';
        cs.starttime = Date.now();
        const room = api.map.getRoom();
        cs.houseId = room?.id ? String(room.id) : '';
        state.carriageData = {
          speed_samples: [],
          rental_cost: cost,
          deposit,
          type: vehicleType,
          parking: '',
        };
        cs.name = vehicleType;
        saveCarriageData(state);
        cecho(api, '\n\n<yellow>Obsluga pojazdu: <red>ON\n');
      }
      return line;
    },
    tag
  );

  api.triggers.register(
    /^Zwracasz/,
    (line) => {
      cs.name = '';
      cs.driveOn = false;
      cs.starttime = 0;
      state.carriageData = null;
      cecho(api, '\n<yellow>Pojazd zostal zwrocony.\n');
      return line;
    },
    tag
  );

  api.triggers.register(
    /^Wsiadasz na (.*) (woz|bryczke|dylizans)\.$/,
    (line, matches) => {
      if (matches) {
        const vehicleName = `${matches[1]} ${matches[2]}`;
        cs.name = vehicleName;
        if (!state.carriageData) {
          state.carriageData = {
            speed_samples: [],
            rental_cost: '',
            deposit: '',
            type: vehicleName,
            parking: '',
          };
        }
        state.carriageData.speed_samples = [];
        saveCarriageData(state);
        cecho(api, '\n\n<yellow>Obsluga pojazdu: <red>ON\n');
      }
      return line;
    },
    tag
  );

  api.aliases.register(/^\/woz$/, () => {
    if (!cs.name || !state.carriageData) {
      cecho(api, '\n<yellow> Brak informacji o uzywanych pojazdach.\n');
      return true;
    }
    cecho(api, `\n<yellow> Informacje o aktualnie uzywanym <tomato>${cs.name}`);
    if (state.carriageData.rental_cost) {
      cecho(api, `\n<yellow> - koszt najmu: <white>${state.carriageData.rental_cost}`);
    }
    if (state.carriageData.deposit) {
      cecho(api, `\n<yellow> - kaucja: <white>${state.carriageData.deposit}`);
    }
    const speed = getAverageSpeed(state.carriageData.speed_samples);
    if (speed > 0) {
      cecho(api, `\n<yellow> - aktualna szybkosc: <white>${speed} l/m`);
    }
    if (cs.starttime > 0) {
      const rentalDate = new Date(cs.starttime).toLocaleString('pl-PL');
      cecho(api, `\n<yellow> - data wypozyczenia: <white>${rentalDate}`);
    }
    cecho(api, '\n\n');
    return true;
  });

  api.aliases.register(/^\/woz\+$/, () => {
    if (!cs.name || !state.carriageData) {
      cecho(api, '\n<yellow> Brak informacji o uzywanych pojazdach.\n');
      return true;
    }
    cecho(api, `\n<yellow> Rozszerzone informacje o <tomato>${cs.name}`);
    if (state.carriageData.rental_cost) {
      cecho(api, `\n<yellow> - koszt najmu: <white>${state.carriageData.rental_cost}`);
    }
    if (state.carriageData.deposit) {
      cecho(api, `\n<yellow> - kaucja: <white>${state.carriageData.deposit}`);
    }
    const speed = getAverageSpeed(state.carriageData.speed_samples);
    if (speed > 0) {
      cecho(api, `\n<yellow> - aktualna szybkosc: <white>${speed} l/m`);
    }
    if (cs.starttime > 0) {
      const rentalDate = new Date(cs.starttime).toLocaleString('pl-PL');
      cecho(api, `\n<yellow> - data wypozyczenia: <white>${rentalDate}`);
      if (cs.houseId) {
        cecho(api, `\n<yellow> - wozownia: <light_slate_blue>${cs.houseId}`);
      }
    }
    cecho(api, `\n<yellow> - wyswietlanie szybkosci: <white>${cs.showSpeed ? 'ON' : 'OFF'}`);
    cecho(api, `\n<yellow> - stan jazdy: <white>${cs.driveOn ? 'w ruchu' : 'postoj'}`);
    cecho(api, '\n\n');
    return true;
  });

  api.aliases.register(/^\/woz-$/, () => {
    cs.showSpeed = !cs.showSpeed;
    if (cs.showSpeed) {
      cecho(api, '\n<yellow>Pokazywanie szybkosci wozu zostalo wlaczone.\n');
    } else {
      cecho(api, '\n<yellow>Pokazywanie szybkosci wozu zostalo wylaczone.\n');
    }
    return true;
  });

  return () => {
    api.triggers.removeByTag(tag);
  };
}
