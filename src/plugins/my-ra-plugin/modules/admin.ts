import type { PluginApi } from '@arkadia/plugin-types';

interface RaState {
  api?: any;
  [key: string]: any;
}

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

export function setupAdmin(api: PluginApi, state: RaState): () => void {
  api.aliases.register(/^\/ustaw_autoryzacje_ra\s*$/, () => {
    cecho(api, '\n<yellow>Uzycie: <white>/ustaw_autoryzacje_ra <rola> <haslo>\n');
    cecho(api, '<grey>Przyklad: /ustaw_autoryzacje_ra Soldato mojehaslo123\n');
    return true;
  });

  api.aliases.register(/^\/ustaw_autoryzacje_ra\s+(\S+)\s+(\S+)\s*$/, (matches: any) => {
    if (!matches) return true;

    const role = matches[1];
    const password = matches[2];

    cecho(api, `\n<yellow>Ustawiono autoryzacje dla roli: <white>${role}\n`);

    if (state.api && typeof state.api.login === 'function') {
      state.api.login().then((success: boolean) => {
        if (success) {
          cecho(api, '<green>Zalogowano pomyslnie.\n');
        } else {
          cecho(api, '<red>Blad logowania. Sprawdz dane.\n');
        }
      }).catch(() => {
        cecho(api, '<red>Blad logowania. Sprawdz dane.\n');
      });
    }
    return true;
  });

  api.aliases.register(/^\/ra_pobierz_dane_online$/, () => {
    cecho(api, '\n<yellow>Pobieranie danych online...\n');

    if (state.api && typeof state.api.get === 'function') {
      Promise.all([
        state.api.get('/api/enemies'),
        state.api.get('/api/keygivers'),
        state.api.get('/api/keygivers/drops/?days=7'),
        state.api.get('/api/keys')
      ]).then((results: any[]) => {
        const [enemiesData, keygiverData, dropsData, keysData] = results;

        if (Array.isArray(enemiesData?.enemies)) {
          state.enemies = enemiesData.enemies;
          cecho(api, `<green>Pobrano ${enemiesData.enemies.length} wrogów.\n`);
        }

        if (Array.isArray(keygiverData?.keyGivers)) {
          state.keygivers = keygiverData.keyGivers;
          cecho(api, `<green>Pobrano ${keygiverData.keyGivers.length} kluczodajek.\n`);
        }

        if (Array.isArray(dropsData?.keyGiverDrops)) {
          state.keygiverDrops = dropsData.keyGiverDrops;
          cecho(api, `<green>Pobrano ${dropsData.keyGiverDrops.length} drops.\n`);
        }

        if (Array.isArray(keysData?.keys)) {
          state.keys = keysData.keys;
          cecho(api, `<green>Pobrano ${keysData.keys.length} kluczy.\n`);
        }

        cecho(api, '<green>Zakonczono pobieranie danych.\n');
      }).catch(() => {
        cecho(api, '<red>Blad pobierania danych.\n');
      });
    }
    return true;
  });

  return () => {
  };
}
