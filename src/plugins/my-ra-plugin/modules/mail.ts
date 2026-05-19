import type { PluginApi } from '@arkadia/plugin-types';

interface RaState {
  mail?: {
    preText?: string;
    postText?: string;
  };
  timeouts: number[];
}

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

function toRomanNumerals(value: number): string {
  const numbers = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000];
  const chars = ['I', 'V', 'X', 'L', 'C', 'D', 'M', 'A', 'R'];

  let s = Math.floor(value);
  if (s <= 0) return String(s);
  let ret = '';
  for (let i = numbers.length - 1; i >= 0; i--) {
    const num = numbers[i];
    while (s - num >= 0 && s > 0) {
      ret += chars[i];
      s -= num;
    }
    for (let j = 0; j < i; j++) {
      const n2 = numbers[j];
      if (s - (num - n2) >= 0 && s < num && s > 0 && num - n2 !== n2) {
        ret += chars[j] + chars[i];
        s -= num - n2;
        break;
      }
    }
  }
  return ret;
}

function createLocationContent(api: PluginApi): string {
  const room = api.map.getRoom();
  const roomId = room?.id || 0;
  return `Dalsze informacje wydaja sie slabo czytelne. Mozesz rozroznic jedynie nastepujace znaki: ${toRomanNumerals(roomId)}`;
}

export function setupMail(api: PluginApi, state: RaState): () => void {
  const tag = 'ra:mail';
  let pendingMail: {
    preText?: string;
    content: string;
    additionalText?: string;
    postText?: string;
  } | null = null;

  api.aliases.register(/^\/wrog\s+(.+)$/, (matches: any) => {
    const to = matches?.[1]?.trim();
    if (!to) {
      cecho(api, '\n<yellow>Podaj adresata listu.\n');
      return true;
    }
    sendMail(to, true);
    return true;
  });

  api.aliases.register(/^\/wrog2\s+(.+)$/, (matches: any) => {
    const to = matches?.[1]?.trim();
    if (!to) {
      cecho(api, '\n<yellow>Podaj adresata listu.\n');
      return true;
    }
    sendMail(to, false);
    return true;
  });

  api.triggers.register(
    /Wpisz ~\?, zeby uzyskac pomoc, lub \*\*, by zakonczyc edycje\./,
    (line) => {
      if (pendingMail) {
        const mail = pendingMail;
        pendingMail = null;
        if (mail.preText) {
          api.command.send(mail.preText);
        }
        api.command.send(mail.content);
        api.command.send(' ');
        if (mail.additionalText) {
          api.command.send(mail.additionalText);
        }
        api.command.send(' ');
        if (mail.postText) {
          api.command.send(mail.postText);
        }
        api.command.send(' ');
        api.command.send('**');
      }
      return line;
    },
    tag
  );

  function sendMail(to: string, withSignature: boolean): void {
    const content = createLocationContent(api);
    const charName = api.gmcp.get()?.char?.info?.name || '';
    pendingMail = {
      preText: state.mail?.preText,
      content,
      additionalText: '',
      postText: withSignature && charName ? charName : state.mail?.postText
    };
    api.command.send('napisz list');
    api.command.send(to);
    api.command.send('Informacja');
    api.command.send(' ');
    const timeoutId = window.setTimeout(() => {
      pendingMail = null;
    }, 6000) as any;
    state.timeouts.push(timeoutId);
  }

  return () => {
    api.triggers.removeByTag(tag);
    pendingMail = null;
  };
}
