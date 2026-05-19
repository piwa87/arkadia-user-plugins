import type { PluginApi } from '@arkadia/plugin-types';

interface Order {
  area: string;
  endtime: string;
  content: string;
}

interface OrderWithId extends Order {
  loca_id: string;
}

interface RaState {
  orders: Record<string, Order>;
  api?: any;
  webhooks?: { zlecenia: string };
}

const POLISH_NUMBERS: Record<string, number> = {
  jeden: 1,
  jedna: 1,
  jedno: 1,
  dwa: 2,
  dwie: 2,
  trzy: 3,
  cztery: 4,
  piec: 5,
  szesc: 6,
  siedem: 7,
  osiem: 8,
  dziewiec: 9,
  dziesiec: 10,
  jedenascie: 11,
  dwanascie: 12,
  dwadziescia: 20,
  trzydziesci: 30,
};

const TIME_THRESHOLDS = [
  { limit: 60 * 60, color: 'red' },
  { limit: 8 * 60 * 60, color: 'yellow' },
];

function getColorByTimeDiff(diffSeconds: number): string {
  for (const threshold of TIME_THRESHOLDS) {
    if (diffSeconds < threshold.limit) {
      return threshold.color;
    }
  }
  return 'green';
}

function rebuildOrders(state: RaState): Record<string, OrderWithId> {
  const raw = state.orders;
  const now = Math.floor(Date.now() / 1000);
  const result: Record<string, OrderWithId> = {};
  for (const [locId, order] of Object.entries(raw)) {
    const endtime = Number(order.endtime);
    if (endtime > now) {
      const key = `${order.endtime}_${locId}`;
      result[key] = {
        ...order,
        loca_id: locId,
      };
    }
  }
  return result;
}

function saveOrders(state: RaState): void {
  // Store orders in local state (implement storage as needed)
  // raStorage.set('orders', state.orders);
}

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

export function setupOrders(api: PluginApi, state: RaState): () => void {
  const tag = 'ra:orders';
  let orderPreText = '';

  if (!state.orders) {
    state.orders = {};
  }

  api.triggers.register(
    /^(.*)do ciebie: Tak, mam pewne pilne zamowienie na (.+)\. Potrzebuje (.+)\. Dobrze zaplace/,
    (line, matches) => {
      if (matches?.[2]) {
        orderPreText = `${matches[2]} (${matches[3]})`;
      }
      return line;
    },
    tag
  );

  api.triggers.register(
    /^(.*)do ciebie: Nie, w tej chwili niczego mi nie trzeba\. Zajrzyj moze za (.+?)\s*(dzien|dni|godzine|godzin)/,
    (line, matches) => {
      if (orderPreText && matches?.[2] && matches?.[3]) {
        const timeStr = matches[2].trim().toLowerCase();
        const timeUnit = matches[3];
        let amount = POLISH_NUMBERS[timeStr];
        if (amount === undefined) {
          amount = Number(timeStr) || 1;
        }
        const multiplier = timeUnit.startsWith('dzien') || timeUnit === 'dni' ? 24 : 1;
        const orderTimestamp = Math.floor(Date.now() / 1000) + amount * multiplier * 120;
        const roomInfo = api.map.getRoom();
        const locId = roomInfo?.id ? String(roomInfo.id) : String(Date.now());
        const area = roomInfo?.area || 'Nieznany';
        state.orders[locId] = {
          area,
          endtime: String(orderTimestamp),
          content: orderPreText,
        };
        saveOrders(state);
        orderPreText = '';
        cecho(api, '\n<green>Zapisano zamowienie.\n');
      }
      return line;
    },
    tag
  );

  api.aliases.register(/^\/ra_zlecenia$/, () => {
    const orders = rebuildOrders(state);
    const keys = Object.keys(orders).sort();
    if (keys.length === 0) {
      cecho(api, '\n<yellow>Brak zapisanych zamowien.\n');
      return true;
    }
    cecho(api, '\n\t<yellow>Dostepne zamowienia dla:\n');
    const now = Math.floor(Date.now() / 1000);
    for (const key of keys) {
      const order = orders[key];
      const endtime = Number(order.endtime);
      const diff = endtime - now;
      const color = getColorByTimeDiff(diff);
      const dateStr = new Date(endtime * 1000).toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      } as any);
      cecho(api, ` <MediumSeaGreen> - ${order.content} - <GhostWhite>${order.area} [id: ${order.loca_id}] - Wazne do <${color}>${dateStr}`);
    }
    cecho(api, '\n\n');
    return true;
  });

  api.aliases.register(/^\/ra_zlecenia_dc$/, () => {
    const orders = rebuildOrders(state);
    const keys = Object.keys(orders).sort();
    if (keys.length === 0) {
      cecho(api, '\n<yellow>Brak zapisanych zamowien.\n');
      return true;
    }
    let output = '\nDostepne zamowienia dla:\n';
    for (const key of keys) {
      const order = orders[key];
      const endtime = Number(order.endtime);
      const dateStr = new Date(endtime * 1000).toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      } as any);
      output += ` + ${order.content} - ${order.area} [id: ${order.loca_id}] - Wazne do ${dateStr}\n`;
    }
    const now = new Date();
    const dateNow = now.toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    } as any);
    const content = `Czas lokalny gracza: ${dateNow}\n${output}`;
    if (state.api?.postDiscord && state.webhooks?.zlecenia) {
      state.api.postDiscord(state.webhooks.zlecenia, content);
    }
    cecho(api, '\n<green>Uaktualniono informacje na DC Alderazzi.\n');
    return true;
  });

  api.aliases.register(/^\/ra_zlecenia_usun\s+(.+)$/, (matches) => {
    const locId = matches?.[1]?.trim() || '';
    if (state.orders[locId]) {
      delete state.orders[locId];
      saveOrders(state);
      cecho(api, `\n<green>Usunieto zamowienie z lokacji ${locId}.\n`);
    } else {
      cecho(api, `\n<yellow>Nie znaleziono zamowienia z lokacji ${locId}.\n`);
    }
    return true;
  });

  return () => {
    api.triggers.removeByTag(tag);
  };
}
