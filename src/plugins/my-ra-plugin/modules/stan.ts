import type { PluginApi } from '@arkadia/plugin-types';

const WEEKLY_IDLE_REQUIREMENT = 18000;
const PREFIX = 'ra:';

interface Storage {
  get(key: string): any;
  set(key: string, value: any): void;
  remove(key: string): void;
}

const raStorage: Storage = {
  get(key: string) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: any) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  },
  remove(key: string) {
    localStorage.removeItem(PREFIX + key);
  }
};

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

function getLastMondayReset(): number {
  const now = Date.now();
  function getWarsawTime(ts: number) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Warsaw',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    }).formatToParts(new Date(ts));
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      dayOfWeek: weekdays.indexOf(p.weekday as string),
      hour: parseInt(p.hour as string),
      minute: parseInt(p.minute as string),
      second: parseInt(p.second as string)
    };
  }
  const { dayOfWeek, hour } = getWarsawTime(now);
  let daysSinceMonday = (dayOfWeek + 6) % 7;
  if (daysSinceMonday === 0 && hour < 2) daysSinceMonday = 7;
  const approx = now - daysSinceMonday * 86400000;
  const { hour: h, minute: m, second: s } = getWarsawTime(approx);
  return approx - (h - 2) * 3600000 - m * 60000 - s * 1000;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0 sek.';
  const days = Math.floor(seconds / 86400);
  let remainder = seconds % 86400;
  const hours = Math.floor(remainder / 3600);
  remainder = remainder % 3600;
  const minutes = Math.floor(remainder / 60);
  const secs = remainder % 60;
  const parts = [];
  if (days > 0) parts.push(`${days} dni`);
  if (hours > 0) parts.push(`${hours} godz.`);
  if (minutes > 0) parts.push(`${minutes} min.`);
  if (secs > 0) parts.push(`${secs} sek.`);
  return parts.join(' ');
}

export function setupStan(api: PluginApi): () => void {
  const tag = 'ra:stan';
  let ageNeeded: number | null = raStorage.get('age_needed');
  let ageNeededSetAt: number | null = raStorage.get('age_needed_set_at');

  function resetIfNewWeek(): boolean {
    if (ageNeeded === null || ageNeededSetAt === null) return false;
    const lastReset = getLastMondayReset();
    if (ageNeededSetAt < lastReset) {
      ageNeeded = null;
      ageNeededSetAt = null;
      raStorage.remove('age_needed');
      raStorage.remove('age_needed_set_at');
      return true;
    }
    return false;
  }

  api.triggers.register(
    /^Wiek:\s+(?:(\d+)\s+dni\s*)?(?:(\d+)\s+godzin[ay]?\s*)?(?:(\d+)\s+minut[ay]?\s*)?(?:(\d+)\s+sekund[ay]?\s*)?\.?\s*$/,
    (line) => {
      const matches = line.text.match(
        /^Wiek:\s+(?:(\d+)\s+dni\s*)?(?:(\d+)\s+godzin[ay]?\s*)?(?:(\d+)\s+minut[ay]?\s*)?(?:(\d+)\s+sekund[ay]?\s*)?\.?\s*$/
      );
      if (!matches) return line;
      const days = Number(matches[1] || 0);
      const hours = Number(matches[2] || 0);
      const minutes = Number(matches[3] || 0);
      const seconds = Number(matches[4] || 0);
      const ageTotal = days * 86400 + hours * 3600 + minutes * 60 + seconds;
      if (ageTotal > 0) {
        resetIfNewWeek();
        if (ageNeeded === null) {
          ageNeeded = ageTotal + WEEKLY_IDLE_REQUIREMENT;
          ageNeededSetAt = Date.now();
          raStorage.set('age_needed', ageNeeded);
          raStorage.set('age_needed_set_at', ageNeededSetAt);
        }
        cecho(api, `<yellow>Potrzebny wiek: <white>${formatDuration(ageNeeded)}\n`);
        const diff = ageNeeded - ageTotal;
        if (diff > 0) {
          cecho(api, `<yellow> Zostalo: <white>${formatDuration(diff)}\n`);
        } else {
          cecho(api, '<green> Wymagany wiek osiagniety!\n');
        }
      }
      return line;
    },
    tag
  );

  api.aliases.register(/^\/stan$/, () => {
    api.command.send('stan');
    return true;
  });

  api.aliases.register(/^\/stan_reset$/, () => {
    ageNeeded = null;
    ageNeededSetAt = null;
    raStorage.remove('age_needed');
    raStorage.remove('age_needed_set_at');
    cecho(api, '\n<yellow>Zresetowano zapisany wymagany wiek.\n');
    return true;
  });

  api.aliases.register(/^\/stan_pokaz$/, () => {
    if (ageNeeded !== null) {
      cecho(api, `\n<yellow>Zapisany wymagany wiek: <white>${formatDuration(ageNeeded)}\n`);
    } else {
      cecho(api, '\n<yellow>Brak zapisanego wymaganego wieku. Uzyj /stan aby obliczyc.\n');
    }
    return true;
  });

  return () => {
    api.triggers.removeByTag(tag);
  };
}
