import type { PluginApi } from '@arkadia/plugin-types';

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
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

export function setupTeam(api: PluginApi): () => void {
  const tag = 'ra:team';

  api.aliases.register(/^\/ddaj\s+(.+)$/, (matches: any) => {
    const item = matches?.[1] || '';
    const members = api.team.getMembers();
    if (!members || members.length === 0) {
      cecho(api, "\n<yellow>Brak czlonkow druzyny.\n");
      return true;
    }
    for (const member of members) {
      api.command.send(`daj ${item} ${member}`);
    }
    return true;
  });

  api.aliases.register(/^\/ddajz\s+(\d+)$/, (matches: any) => {
    const amount = Number(matches?.[1] || 0);
    if (amount <= 0) {
      cecho(api, "\n<yellow>He? Ile chcesz dac?\n");
      return true;
    }
    const members = api.team.getMembers();
    if (!members || members.length === 0) {
      cecho(api, "\n<yellow>Brak czlonkow druzyny.\n");
      return true;
    }
    const goldStr = coinDeclension(amount, 'zloto');
    for (const member of members) {
      api.command.send(`daj ${goldStr} ${member}`);
    }
    return true;
  });

  api.aliases.register(/^\/plaszcze$/, () => {
    const members = api.team.getMembers();
    if (!members || members.length === 0) {
      cecho(api, "\n<yellow>Brak czlonkow druzyny.\n");
      return true;
    }
    for (const member of members) {
      api.command.send(`ob ${member}`);
    }
    cecho(api, "\n<yellow>Sprawdzam plaszcze druzyny...\n");
    return true;
  });

  api.aliases.register(/^\/zapr$/, () => {
    api.command.send('/zap 0');
    return true;
  });

  api.aliases.register(/^\/razm$/, () => {
    api.command.send('powiedz do druzyny zmeczenie?');
    return true;
  });

  api.aliases.register(/^\/got$/, () => {
    api.command.send('snprzekaz gotow, pytanie');
    return true;
  });

  api.aliases.register(/^\/kup_bilety$/, () => {
    const members = api.team.getMembers();
    if (!members || members.length === 0) {
      cecho(api, "\n<yellow>Brak czlonkow druzyny.\n");
      return true;
    }
    for (const member of members) {
      api.command.send('kup bilet');
      api.command.send(`daj bilet ${member}`);
    }
    api.command.send('kup bilet');
    return true;
  });

  const otulPatterns = [
    /^(.+?) .*: [Oo]tulcie\.?$/,
    /^(.+?) (?:naciaga na glowe kaptur i )?otula sie szczelnie .*\.$/,
    /^(.+?) .*: Otulom se plascym\.?$/,
    /^(.+?) .*: Otulcie sie plaszczem\.?$/
  ];

  for (const pattern of otulPatterns) {
    api.triggers.register(
      pattern,
      (line) => {
        api.bind.set('otul sie plaszczem');
        return line;
      },
      tag
    );
  }

  api.triggers.register(
    /wykonuje gesty oznaczajace "gotow" i "pytanie"\.$/,
    (line) => {
      api.bind.set('snprzekaz gotow');
      return line;
    },
    tag
  );

  return () => {
    api.triggers.removeByTag(tag);
  };
}
