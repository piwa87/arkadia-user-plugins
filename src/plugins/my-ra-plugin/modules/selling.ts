import type { PluginApi } from '@arkadia/plugin-types';

interface Money {
  miedz: number;
  srebro: number;
  zloto: number;
  mithryl: number;
  suma: number;
}

interface RaState {
  money?: Money | null;
  bankTransactionCost: number;
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
  trzynascie: 13,
  czternascie: 14,
  pietnascie: 15,
  szesnascie: 16,
  siedemnascie: 17,
  osiemnascie: 18,
  dziewietnascie: 19,
  dwadziescia: 20,
  trzydziesci: 30,
  czterdziesci: 40,
  piecdziesiat: 50,
  szescdziesiat: 60,
  siedemdziesiat: 70,
  osiemdziesiat: 80,
  dziewiecdziesiat: 90,
  sto: 100,
  dwiescie: 200,
  trzysta: 300,
  czterysta: 400,
  piecset: 500,
  szescset: 600,
  siedemset: 700,
  osiemset: 800,
  dziewiecset: 900,
  tysiac: 1000
};

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

function emptyMoney(): Money {
  return { miedz: 0, srebro: 0, zloto: 0, mithryl: 0, suma: 0 };
}

function toCopper(money: Money): number {
  return money.miedz + money.srebro * 12 + money.zloto * 20 * 12 + money.mithryl * 100 * 20 * 12;
}

function moneyPercent(money: Money, percent: number): Money {
  const factor = percent / 100;
  return {
    miedz: Math.floor(money.miedz * factor),
    srebro: Math.floor(money.srebro * factor),
    zloto: Math.floor(money.zloto * factor),
    mithryl: Math.floor(money.mithryl * factor),
    suma: Math.floor(money.suma * factor)
  };
}

function coinDeclension(amount: number, coinType: string): string {
  const lastDigit = amount % 10;
  const lastTwoDigits = amount % 100;
  const isTeens = lastTwoDigits >= 10 && lastTwoDigits <= 19;
  const forms: Record<string, [string, string, string]> = {
    miedz: ['miedziana monete', 'miedziane monety', 'miedzianych monet'],
    srebro: ['srebrna monete', 'srebrne monety', 'srebrnych monet'],
    zloto: ['zlota monete', 'zlote monety', 'zlotych monet'],
    mithryl: ['mithrylowa monete', 'mithrylowe monety', 'mithrylowych monet']
  };

  const form = forms[coinType];
  if (!form) return `${amount} ${coinType}`;

  const [one, few, many] = form;
  if (amount === 1) return `${amount} ${one}`;
  if (isTeens) return `${amount} ${many}`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${amount} ${few}`;
  return `${amount} ${many}`;
}

function parseMoneyText(text: string): Money {
  const money = emptyMoney();
  const words = text.split(' ');
  let currentNum = 0;

  for (const word of words) {
    if (word === 'i') continue;
    const prefix = word.substring(0, 3);
    if (prefix === 'mie') {
      money.miedz = currentNum;
    } else if (prefix === 'zlo') {
      money.zloto = currentNum;
    } else if (prefix === 'sre') {
      money.srebro = currentNum;
    } else if (prefix === 'mit') {
      money.mithryl = currentNum;
    } else {
      const parsed = POLISH_NUMBERS[word.toLowerCase()];
      currentNum = parsed ?? (Number(word) || 0);
    }
  }
  money.suma = toCopper(money);
  return money;
}

function getMoneyString(data: Money): string {
  let str = '';
  if (data.mithryl > 0) str += ` <CornflowerBlue>${data.mithryl} mth`;
  if (data.zloto > 0) str += ` <gold>${data.zloto} zl`;
  if (data.srebro > 0) str += ` <grey>${data.srebro} sr`;
  if (data.miedz > 0) str += ` <sienna>${data.miedz} mdz`;
  return str;
}

function parseMoney(text: string, state: RaState, accumulate: boolean): Money {
  const parsed = parseMoneyText(text);
  if (accumulate && state.money) {
    const combined: Money = {
      miedz: parsed.miedz + state.money.miedz,
      srebro: parsed.srebro + state.money.srebro,
      zloto: parsed.zloto + state.money.zloto,
      mithryl: parsed.mithryl + state.money.mithryl,
      suma: parsed.suma + state.money.suma
    };
    state.money = combined;
    return combined;
  }
  state.money = parsed;
  return parsed;
}

export function setupSelling(api: PluginApi, state: RaState): () => void {
  const tag = 'ra:selling';

  api.triggers.register(
    /dostalbys (.+) monet/,
    (line: any, matches: any) => {
      if (matches?.[1]) {
        parseMoney(matches[1], state, true);
      }
      return line;
    },
    tag
  );

  api.triggers.register(
    /dostalabys (.+) monet/,
    (line: any, matches: any) => {
      if (matches?.[1]) {
        parseMoney(matches[1], state, true);
      }
      return line;
    },
    tag
  );

  api.triggers.register(
    /ostajesz (.+) monet/,
    (line: any, matches: any) => {
      if (matches?.[1]) {
        parseMoney(matches[1], state, true);
      }
      return line;
    },
    tag
  );

  api.aliases.register(/^\/mpokaz\s+(\d+)$/, (matches: any) => {
    const percent = Number(matches?.[1] || 100);
    if (!state.money) {
      cecho(api, '\n<yellow> Brak informacji o cenie towaru.\n');
      return true;
    }
    const portion = moneyPercent(state.money, percent);
    const str = getMoneyString(portion);
    const afterBank = moneyPercent(portion, 100 - state.bankTransactionCost);
    cecho(api, `\n<tomato>  ${percent} % <green>z monet to${str} (<yellow>po denominacji (z kosztem ${state.bankTransactionCost}%) ${getMoneyString(afterBank)}) <grey>[rownowartosc w miedziakach: ${portion.suma}]\n`);
    return true;
  });

  api.aliases.register(/^\/mpokaz$/, () => {
    if (!state.money) {
      cecho(api, '\n<yellow> Brak informacji o cenie towaru.\n');
      return true;
    }
    const str = getMoneyString(state.money);
    const afterBank = moneyPercent(state.money, 100 - state.bankTransactionCost);
    cecho(api, `\n<tomato>  100 % <green>z monet to${str} (<yellow>po denominacji (z kosztem ${state.bankTransactionCost}%) ${getMoneyString(afterBank)}) <grey>[rownowartosc w miedziakach: ${state.money.suma}]\n`);
    return true;
  });

  api.aliases.register(/^\/mwloz\s+(\d+)\s+(.+)$/, (matches: any) => {
    const percent = Number(matches?.[1] || 100);
    const container = matches?.[2] || '';
    if (!state.money) {
      cecho(api, '\n<yellow> Brak informacji o cenie.\n');
      return true;
    }
    const portion = moneyPercent(state.money, percent);
    const coinTypes = ['miedz', 'srebro', 'zloto', 'mithryl'] as const;
    for (const coinType of coinTypes) {
      if (portion[coinType] > 0) {
        api.command.send(`wloz ${coinDeclension(portion[coinType], coinType)} ${container}`);
      }
    }
    return true;
  });

  api.aliases.register(/^\/mustaw\s+(\d+)$/, (matches: any) => {
    const old = state.bankTransactionCost;
    state.bankTransactionCost = Number(matches?.[1] || 0);
    cecho(api, `\n<yellow>Przestawiono procent kosztow przy denominacji z ${old}% na ${state.bankTransactionCost}%.\n`);
    return true;
  });

  api.aliases.register(/^\/musun_historie$/, () => {
    state.money = null;
    cecho(api, '\n<yellow>Wyczyszczono historie sprzedazy.\n');
    return true;
  });

  return () => {
    api.triggers.removeByTag(tag);
  };
}
