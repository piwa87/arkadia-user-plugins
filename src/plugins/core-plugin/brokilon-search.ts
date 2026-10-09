import type { PluginApi } from '@arkadia/plugin-types';
import { getMyColor } from '../../lib/colors/my-colors';
import { renderFooterChip } from '../../lib/footerChip';
import { registerTokenGate } from '../../lib/registerTokenGate';

const TAG = 'brokilonSearch';
const SELF = Symbol('self');

export const BROKILON_SEARCH_PLACES = [
  { alias: 'p1', target: 'dlon', label: 'dlon' },
  { alias: 'p2', target: 'ksiege', label: 'ksiega' },
  { alias: 'p3', target: 'kafelek', label: 'kafelek' },
  { alias: 'p4', target: 'polke', label: 'polka' },
  { alias: 'p5', target: 'dziure', label: 'dziura' },
  { alias: 'p6', target: 'piedestaly', label: 'piedestaly' },
] as const;

type Target = typeof BROKILON_SEARCH_PLACES[number]['target'];

export function setupBrokilonSearch(api: PluginApi, isEnabled: () => boolean) {
  const completed = new Set<Target>();
  const active = new Map<string | symbol, { target: Target; name: string }>();
  const colors = {
    pending: getMyColor(11, api),
    searching: getMyColor(13, api),
    done: getMyColor(4, api),
  };
  let footer: ReturnType<PluginApi['ui']['registerFooterComponent']> | null = null;
  let pendingSelfResult: Target | null = null;
  let testRun = 0;

  const searchers = (target: Target) => [...active.values()]
    .filter((search) => search.target === target)
    .map((search) => search.name);

  const status = (target: Target) => completed.has(target)
    ? 'done' : searchers(target).length > 0 ? 'searching' : 'pending';

  const render = () => {
    const content = BROKILON_SEARCH_PLACES.map(({ alias, target, label }) => {
      const state = status(target);
      const chip = renderFooterChip({
        label: `${alias} ${label}`,
        value: state === 'done' ? 'OK' : state === 'searching' ? '...' : '?',
        tone: state === 'done' ? 'ok' : state === 'searching' ? 'warn' : 'neutral',
      });
      return `<button type="button" data-brokilon-search="${target}" title="przeszukaj ${target}"` +
        ' style="border:0;padding:0;background:none;color:inherit;font:inherit;cursor:pointer">' +
        `${chip}</button>`;
    }).join('');
    if (!footer) {
      footer = api.ui.registerFooterComponent('brokilon-search', content);
      // Delegate from the stable footer wrapper so replacing chip markup keeps clicks working.
      footer.element.onclick = (event) => {
        if (!isEnabled() || !footer) return;
        const element = event.target as Element | null;
        const button = element?.closest?.<HTMLButtonElement>('button[data-brokilon-search]');
        const place = BROKILON_SEARCH_PLACES.find(({ target }) => target === button?.dataset.brokilonSearch);
        if (place) void api.command.send(`przeszukaj ${place.target}`);
      };
    } else footer.setContent(content);
    footer.setVisible(true);
  };

  const printPlace = (target: Target) => {
    const place = BROKILON_SEARCH_PLACES.find((entry) => entry.target === target)!;
    const state = status(target);
    const description = state === 'done' ? 'przeszukane'
      : state === 'searching' ? `w trakcie (${searchers(target).join(', ')})`
        : 'do przeszukania';
    const text = `[Brokilon] ${place.alias} ${place.label}: ${description}`;
    const buffer = new api.AnsiAwareBuffer(text);
    buffer.color([0, text.length], colors[state]);
    api.output.print(buffer);
  };

  const reset = () => {
    testRun++;
    completed.clear();
    active.clear();
    pendingSelfResult = null;
    if (footer) render();
  };

  const finish = (actor: string | symbol, target: Target) => {
    const wasDone = completed.has(target);
    completed.add(target);
    if (active.get(actor)?.target === target) active.delete(actor);
    if (actor === SELF) pendingSelfResult = null;
    render();
    if (!wasDone) printPlace(target);
  };

  registerTokenGate(
    api,
    'przeszukiwac',
    /^(?:(Zaczynasz|Przestajesz|Konczysz)|(.+?) (zaczyna|przestaje|konczy)) przeszukiwac (dlon|ksiege|kafelek|polke|dziure|piedestaly)\.$/i,
    (line, matches) => {
      if (!isEnabled()) return line;
      const actor = matches[1] ? SELF : matches[2].toLowerCase();
      const action = (matches[1] || matches[3]).toLowerCase();
      const target = matches[4].toLowerCase() as Target;
      if (action === 'konczy' || action === 'konczysz') {
        finish(actor, target);
      } else if (action === 'zaczyna' || action === 'zaczynasz') {
        if (actor === SELF) pendingSelfResult = null;
        // A person can search only one place at a time. Switching abandons the old one.
        active.set(actor, { target, name: actor === SELF ? 'Ty' : matches[2] });
        render();
      } else if (active.get(actor)?.target === target) {
        active.delete(actor);
        if (actor === SELF) pendingSelfResult = null;
        render();
        printPlace(target);
      }
      return line;
    },
    TAG,
  );

  // First-person result introductions confirmed by the supplied game logs.
  // The generic failure line alone must never mark an unrelated search as complete.
  const resultIntroductions: { target: Target; token: string; pattern: RegExp }[] = [
    {
      target: 'dziure', token: 'dziurze',
      pattern: /^Przygladasz sie dziurze uwazniej, probujac znalezc jakiekolwiek slady tego, co bylo na jej miejscu\.$/,
    },
    {
      target: 'dlon', token: 'dloni',
      pattern: /^Zagladasz do zacisnietej dloni elfki, spodziewajac sie jakiegos niewielkiego przedmiotu - broszki, pierscionka, kolczyka\.$/,
    },
  ];
  for (const { target, token, pattern } of resultIntroductions) {
    registerTokenGate(api, token, pattern, (line) => {
      if (isEnabled()) pendingSelfResult = active.get(SELF)?.target === target ? target : null;
      return line;
    }, TAG);
  }
  registerTokenGate(
    api,
    'Niestety',
    /^Niestety nic takiego tu nie ma\.$/,
    (line) => {
      if (isEnabled() && pendingSelfResult && active.get(SELF)?.target === pendingSelfResult) {
        finish(SELF, pendingSelfResult);
      }
      return line;
    },
    TAG,
  );

  api.aliases.register(/^brokszuk$/i, () => {
    if (!isEnabled()) return true;
    render();
    for (const { target } of BROKILON_SEARCH_PLACES) printPlace(target);
    return true;
  });
  api.aliases.register(/^brokszuk_reset$/i, () => {
    if (!isEnabled()) return true;
    reset();
    render();
    api.output.print('[Brokilon] Tracking przeszukiwania wyzerowany.');
    return true;
  });

  api.aliases.register(/^brokszuk_test$/i, () => {
    if (!isEnabled()) return true;
    reset();
    const run = testRun;
    const replay = async () => {
      for (const command of [
        '/fake Zaczynasz przeszukiwac dlon.',
        '/fake Zutzer zaczyna przeszukiwac ksiege.',
        '/fake Soroko zaczyna przeszukiwac kafelek.',
        '/fake Aldaron zaczyna przeszukiwac polke.',
        '/fake Konczysz przeszukiwac dlon.',
        '/fake Zutzer konczy przeszukiwac ksiege.',
        '/fake Soroko przestaje przeszukiwac kafelek.',
        '/fake Aldaron przestaje przeszukiwac polke.',
        'brokszuk',
      ]) {
        if (!isEnabled() || run !== testRun) return;
        await api.command.send(command);
      }
    };
    void replay().catch(() => {
      if (isEnabled() && run === testRun) api.output.print('[Brokilon] Nie udalo sie odtworzyc testu przeszukiwania.');
    });
    return true;
  });

  return {
    reset,
    foundKey: (finder?: string) => {
      if (!isEnabled()) return;
      const actor = finder ? finder.toLowerCase() : SELF;
      const search = active.get(actor);
      if (search) finish(actor, search.target);
    },
    hide: () => {
      testRun++;
      active.clear();
      pendingSelfResult = null;
      footer?.setVisible(false);
    },
    destroy: () => {
      testRun++;
      active.clear();
      completed.clear();
      pendingSelfResult = null;
      if (footer) {
        footer.element.onclick = null;
        footer.remove();
      }
      footer = null;
      api.triggers.removeByTag(TAG);
    },
  };
}
