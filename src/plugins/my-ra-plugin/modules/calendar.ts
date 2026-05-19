import type { PluginApi } from '@arkadia/plugin-types';

interface ClockData {
  domain: string;
  dayOfYear: number;
  hours: number;
  minutes: number;
}

interface TimeData {
  dayOfYear: number;
  hours: number;
  minutes: number;
}

interface CalendarEvent {
  label: string;
  color: string;
  gameMinutesUntil: number;
  realMinutesUntil: number;
  isActive: boolean;
  isSpan: boolean;
  startDay: number;
  startHour: number;
  endDay?: number;
  endHour?: number;
}

const EVENTS = {
  Empire: {
    spans: [
      { type: 'full_moon', label: 'Pelnia', start: { day: 1, hour: 17 }, end: { day: 2, hour: 8 }, color: 'alice_blue' },
      { type: 'new_moon', label: 'Now', start: { day: 14, hour: 17 }, end: { day: 15, hour: 8 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 26, hour: 17 }, end: { day: 27, hour: 8 }, color: 'alice_blue' },
      { type: 'new_moon', label: 'Now', start: { day: 39, hour: 18 }, end: { day: 40, hour: 7 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 51, hour: 18 }, end: { day: 52, hour: 7 }, color: 'alice_blue' },
      { type: 'new_moon', label: 'Now', start: { day: 64, hour: 18 }, end: { day: 65, hour: 7 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 76, hour: 19 }, end: { day: 77, hour: 6 }, color: 'alice_blue' },
      { type: 'new_moon', label: 'Now', start: { day: 89, hour: 19 }, end: { day: 90, hour: 6 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 102, hour: 21 }, end: { day: 103, hour: 5 }, color: 'alice_blue' },
      { type: 'new_moon', label: 'Now', start: { day: 114, hour: 20 }, end: { day: 115, hour: 5 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 126, hour: 20 }, end: { day: 127, hour: 5 }, color: 'alice_blue' },
      { type: 'new_moon', label: 'Now', start: { day: 139, hour: 21 }, end: { day: 140, hour: 5 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 151, hour: 21 }, end: { day: 152, hour: 5 }, color: 'alice_blue' },
      { type: 'new_moon', label: 'Now', start: { day: 164, hour: 21 }, end: { day: 165, hour: 5 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 176, hour: 22 }, end: { day: 177, hour: 4 }, color: 'alice_blue' },
      { type: 'new_moon', label: 'Now', start: { day: 189, hour: 22 }, end: { day: 190, hour: 4 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pot. Geheimnisnacht', start: { day: 202, hour: 20 }, end: { day: 203, hour: 5 }, color: 'cyan' },
      { type: 'new_moon', label: 'Now', start: { day: 214, hour: 20 }, end: { day: 215, hour: 5 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pot. Geheimnisnacht', start: { day: 227, hour: 20 }, end: { day: 228, hour: 5 }, color: 'cyan' },
      { type: 'new_moon', label: 'Now', start: { day: 239, hour: 20 }, end: { day: 240, hour: 5 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pot. Geheimnisnacht', start: { day: 251, hour: 20 }, end: { day: 252, hour: 5 }, color: 'cyan' },
      { type: 'new_moon', label: 'Now', start: { day: 264, hour: 20 }, end: { day: 265, hour: 5 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pot. Geheimnisnacht', start: { day: 276, hour: 19 }, end: { day: 277, hour: 6 }, color: 'cyan' },
      { type: 'new_moon', label: 'Now', start: { day: 289, hour: 19 }, end: { day: 290, hour: 6 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pot. Geheimnisnacht', start: { day: 301, hour: 18 }, end: { day: 302, hour: 6 }, color: 'cyan' },
      { type: 'new_moon', label: 'Now', start: { day: 314, hour: 18 }, end: { day: 315, hour: 6 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 326, hour: 18 }, end: { day: 327, hour: 6 }, color: 'alice_blue' },
      { type: 'new_moon', label: 'Now', start: { day: 339, hour: 17 }, end: { day: 340, hour: 7 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 351, hour: 17 }, end: { day: 352, hour: 7 }, color: 'alice_blue' },
      { type: 'new_moon', label: 'Now', start: { day: 364, hour: 17 }, end: { day: 365, hour: 7 }, color: 'slate_blue' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 376, hour: 16 }, end: { day: 377, hour: 8 }, color: 'alice_blue' },
      { type: 'new_moon', label: 'Now', start: { day: 389, hour: 16 }, end: { day: 390, hour: 8 }, color: 'slate_blue' }
    ],
    instants: [
      { type: 'special', label: 'Hexennacht - pylki', at: { day: 1, hour: 17 }, color: 'green_yellow' },
      { type: 'season', label: 'Poczatek wiosny', at: { day: 18, hour: 0 }, color: 'dim_grey' },
      { type: 'season', label: 'Poczatek lata', at: { day: 118, hour: 0 }, color: 'dim_grey' },
      { type: 'season', label: 'Poczatek jesieni', at: { day: 218, hour: 0 }, color: 'dim_grey' },
      { type: 'season', label: 'Poczatek zimy', at: { day: 319, hour: 0 }, color: 'dim_grey' }
    ]
  },
  Ishtar: {
    spans: [
      { type: 'full_moon', label: 'Pelnia', start: { day: 4, hour: 0 }, end: { day: 6, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 4, hour: 2 }, end: { day: 4, hour: 8 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 7, hour: 22 }, end: { day: 8, hour: 8 }, color: 'peru' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 28, hour: 0 }, end: { day: 30, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 28, hour: 2 }, end: { day: 28, hour: 8 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 31, hour: 22 }, end: { day: 32, hour: 8 }, color: 'peru' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 52, hour: 0 }, end: { day: 54, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 52, hour: 2 }, end: { day: 52, hour: 7 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 55, hour: 22 }, end: { day: 56, hour: 7 }, color: 'peru' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 76, hour: 0 }, end: { day: 78, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 76, hour: 2 }, end: { day: 76, hour: 7 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 79, hour: 22 }, end: { day: 80, hour: 7 }, color: 'peru' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 100, hour: 0 }, end: { day: 102, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 100, hour: 2 }, end: { day: 100, hour: 6 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 103, hour: 22 }, end: { day: 104, hour: 6 }, color: 'peru' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 124, hour: 0 }, end: { day: 126, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 124, hour: 2 }, end: { day: 124, hour: 6 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 127, hour: 22 }, end: { day: 128, hour: 6 }, color: 'peru' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 148, hour: 0 }, end: { day: 150, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 148, hour: 2 }, end: { day: 148, hour: 5 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 151, hour: 22 }, end: { day: 152, hour: 5 }, color: 'peru' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 172, hour: 0 }, end: { day: 174, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 172, hour: 2 }, end: { day: 172, hour: 5 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 175, hour: 22 }, end: { day: 176, hour: 5 }, color: 'peru' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 196, hour: 0 }, end: { day: 198, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 196, hour: 2 }, end: { day: 196, hour: 4 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 199, hour: 22 }, end: { day: 200, hour: 4 }, color: 'peru' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 220, hour: 0 }, end: { day: 224, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 220, hour: 2 }, end: { day: 220, hour: 4 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 225, hour: 22 }, end: { day: 226, hour: 5 }, color: 'peru' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 244, hour: 0 }, end: { day: 246, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 244, hour: 2 }, end: { day: 244, hour: 5 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 247, hour: 22 }, end: { day: 248, hour: 5 }, color: 'peru' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 268, hour: 0 }, end: { day: 270, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 268, hour: 2 }, end: { day: 268, hour: 5 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 271, hour: 22 }, end: { day: 272, hour: 7 }, color: 'peru' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 292, hour: 0 }, end: { day: 294, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 292, hour: 2 }, end: { day: 292, hour: 7 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 295, hour: 22 }, end: { day: 296, hour: 7 }, color: 'peru' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 316, hour: 0 }, end: { day: 318, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 316, hour: 2 }, end: { day: 316, hour: 6 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 319, hour: 22 }, end: { day: 320, hour: 6 }, color: 'peru' },
      { type: 'full_moon', label: 'Pelnia', start: { day: 340, hour: 0 }, end: { day: 342, hour: 0 }, color: 'powder_blue' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 340, hour: 2 }, end: { day: 340, hour: 6 }, color: 'peru' },
      { type: 'spy', label: 'Szpiedzy', start: { day: 343, hour: 22 }, end: { day: 344, hour: 6 }, color: 'peru' }
    ],
    instants: [
      { type: 'season', label: 'Poczatek zimy / Przesilenie zimowe', at: { day: 1, hour: 0 }, color: 'dim_grey' },
      { type: 'season', label: 'Poczatek wiosny / Rownonoc wiosenna', at: { day: 91, hour: 0 }, color: 'dim_grey' },
      { type: 'special', label: 'Belleteyn - pylki', at: { day: 136, hour: 0 }, color: 'green_yellow' },
      { type: 'season', label: 'Poczatek lata / Przesilenie letnie', at: { day: 181, hour: 0 }, color: 'dim_grey' },
      { type: 'season', label: 'Poczatek jesieni / Rownonoc jesienna', at: { day: 271, hour: 0 }, color: 'dim_grey' },
      { type: 'special', label: 'Saovine - dziady', at: { day: 315, hour: 18 }, color: 'green_yellow' }
    ]
  }
};

function timeToMinutes(day: number, hour: number, minute = 0): number {
  return day * 24 * 60 + hour * 60 + minute;
}

function minutesToReal(gameMinutes: number): number {
  return gameMinutes / 30;
}

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

export function setupCalendar(api: PluginApi): () => void {
  const tag = 'ra:calendar';
  const timeByDomain: Record<string, TimeData> = {
    Empire: { dayOfYear: 0, hours: 0, minutes: 0 },
    Ishtar: { dayOfYear: 0, hours: 0, minutes: 0 }
  };
  let activeDomain = 'Empire';

  api.events.on('clock.update', (clock: ClockData) => {
    const domain = clock.domain;
    timeByDomain[domain] = {
      dayOfYear: clock.dayOfYear,
      hours: clock.hours,
      minutes: clock.minutes
    };
  });

  api.events.on('clock.domain.active', (event: { domain: string }) => {
    activeDomain = event.domain;
  });

  function getNextEvents(count: number | undefined, domain: string): CalendarEvent[] {
    const time = timeByDomain[domain];
    const now = timeToMinutes(time.dayOfYear, time.hours, time.minutes);
    const domainEvents = EVENTS[domain as keyof typeof EVENTS];
    const yearLen = domain === 'Empire' ? 400 * 24 * 60 : 360 * 24 * 60;
    const results: CalendarEvent[] = [];

    for (const span of domainEvents.spans) {
      const start = timeToMinutes(span.start.day, span.start.hour);
      const end = timeToMinutes(span.end.day, span.end.hour);
      const isActive = now >= start && now < end;
      let until = start - now;
      if (until <= 0 && !isActive) until += yearLen;

      results.push({
        label: span.label,
        color: span.color,
        gameMinutesUntil: isActive ? 0 : until,
        realMinutesUntil: isActive ? 0 : minutesToReal(until),
        isActive,
        isSpan: true,
        startDay: span.start.day,
        startHour: span.start.hour,
        endDay: span.end.day,
        endHour: span.end.hour
      });
    }

    for (const inst of domainEvents.instants) {
      const at = timeToMinutes(inst.at.day, inst.at.hour);
      let until = at - now;
      if (until <= 0) until += yearLen;

      results.push({
        label: inst.label,
        color: inst.color,
        gameMinutesUntil: until,
        realMinutesUntil: minutesToReal(until),
        isActive: false,
        isSpan: false,
        startDay: inst.at.day,
        startHour: inst.at.hour
      });
    }

    results.sort((a, b) => a.gameMinutesUntil - b.gameMinutesUntil);
    return count !== undefined ? results.slice(0, count) : results;
  }

  function formatEvent(event: CalendarEvent, index: number): string {
    if (event.isActive) return `${index}. ${event.label} - TERAZ`;

    const now = new Date();
    const eventTime = new Date(now.getTime() + event.realMinutesUntil * 60 * 1000);
    const dd = String(eventTime.getDate()).padStart(2, '0');
    const mm = String(eventTime.getMonth() + 1).padStart(2, '0');
    const hh = String(eventTime.getHours()).padStart(2, '0');
    const mi = String(eventTime.getMinutes()).padStart(2, '0');
    const realH = Math.floor(event.realMinutesUntil / 60);
    const realM = Math.floor(event.realMinutesUntil % 60);
    const timeStr = realH > 0 ? `za ${realH}h ${realM}m` : `za ${realM}m`;
    let line = `${index}. ${event.label} - ${dd}.${mm} ${hh}:${mi} (${timeStr})`;

    if (event.isSpan && event.endDay !== undefined && event.endHour !== undefined) {
      const durGame = timeToMinutes(event.endDay, event.endHour) - timeToMinutes(event.startDay, event.startHour);
      const durReal = minutesToReal(durGame);
      const dH = Math.floor(durReal / 60);
      const dM = Math.floor(durReal % 60);
      line += dH > 0 ? ` (trwa ${dH}h ${dM}m)` : ` (trwa ${dM}m)`;
    }

    return line;
  }

  api.aliases.register(/^\/czas$/, () => {
    for (const domain of ['Empire', 'Ishtar']) {
      const t = timeByDomain[domain];
      if (!t.dayOfYear && !t.hours && !t.minutes) continue;
      cecho(api, `\n<yellow>=== ${domain} ===\n`);
      const events = getNextEvents(4, domain);
      for (let i = 0; i < events.length; i++) {
        cecho(api, `  <${events[i].color}>${formatEvent(events[i], i + 1)}\n`);
      }
    }
    cecho(api, '\n');
    return true;
  });

  api.aliases.register(/^\/czas\+$/, () => {
    for (const domain of ['Empire', 'Ishtar']) {
      const t = timeByDomain[domain];
      if (!t.dayOfYear && !t.hours && !t.minutes) continue;
      cecho(api, `\n<yellow>=== ${domain} ===\n`);
      const events = getNextEvents(20, domain);
      for (let i = 0; i < events.length; i++) {
        cecho(api, `  <${events[i].color}>${formatEvent(events[i], i + 1)}\n`);
      }
    }
    cecho(api, '\n');
    return true;
  });

  api.aliases.register(/^\/czas_imperium$/, () => {
    cecho(api, '\n<yellow>=== Empire ===\n');
    const events = getNextEvents(10, 'Empire');
    for (let i = 0; i < events.length; i++) {
      cecho(api, `  <${events[i].color}>${formatEvent(events[i], i + 1)}\n`);
    }
    cecho(api, '\n');
    return true;
  });

  api.aliases.register(/^\/czas_ishtar$/, () => {
    cecho(api, '\n<yellow>=== Ishtar ===\n');
    const events = getNextEvents(10, 'Ishtar');
    for (let i = 0; i < events.length; i++) {
      cecho(api, `  <${events[i].color}>${formatEvent(events[i], i + 1)}\n`);
    }
    cecho(api, '\n');
    return true;
  });

  api.aliases.register(/^\/now$/, () => {
    for (const domain of ['Empire', 'Ishtar']) {
      const t = timeByDomain[domain];
      if (!t.dayOfYear && !t.hours && !t.minutes) continue;
      cecho(api, `<yellow>[${domain}] <white>Dzien ${t.dayOfYear}, godzina ${t.hours}:${String(t.minutes).padStart(2, '0')}\n`);
    }
    return true;
  });

  return () => {
    // cleanup if needed
  };
}
