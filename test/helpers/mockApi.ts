import { vi } from 'vitest';
import type { PluginApi } from '@arkadia/plugin-types';

export class MockAnsiAwareBuffer {
  constructor(public text: string = '') {}
  append(text: string, _state?: unknown): this {
    this.text += text;
    return this;
  }
  appendBuffer(buffer: MockAnsiAwareBuffer): this {
    this.text += buffer.text;
    return this;
  }
  color(_range: [number, number], _color: unknown): this {
    return this;
  }
  clear(): this {
    this.text = '';
    return this;
  }
}

export interface TriggerOptions {
  stayOpenLines?: number;
  caseInsensitive?: boolean;
}

export type TriggerPattern =
  | RegExp
  | string
  | ((line: any, matches: null, type: string) => RegExpMatchArray | undefined)
  | (RegExp | string)[];

export interface RegisteredTrigger {
  pattern: TriggerPattern;
  callback: (line: any, matches: RegExpMatchArray, type?: string, originalLine?: string) => any;
  tag: string;
  options?: TriggerOptions;
}

export interface RegisteredOneTimeTrigger {
  pattern: TriggerPattern;
  callback: (line: any, matches: RegExpMatchArray, type?: string, originalLine?: string) => any;
  tag: string;
  options?: TriggerOptions;
}

export interface RegisteredTokenTrigger {
  token: string;
  words: string[];
  callback: (line: any, matches: RegExpMatchArray, type?: string, originalLine?: string) => any;
  tag: string;
  options?: TriggerOptions;
}

// Mirrors the client tokenizer (Triggers.ts): split on whitespace + punctuation, lowercase.
export const TOKEN_SPLIT = /[ \n\t.,!?*()/[\]]+/;

export interface RegisteredAlias {
  pattern: RegExp;
  callback: (matches?: RegExpMatchArray) => boolean | void;
}

export interface RegisteredCommandHook {
  callback: (command: string, echo?: boolean, options?: unknown) => string | null | undefined;
  priority?: number;
}

export interface MockFooterComponent {
  id: string;
  initialContent: string;
  handle: {
    element: HTMLSpanElement;
    setContent: ReturnType<typeof vi.fn>;
    setVisible: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
}

export function createMockLine(text: string) {
  const line: any = {
    text,
    color: vi.fn(() => line),
    colorWords: vi.fn(() => line),
    replace: vi.fn((range: [number, number], replacement: string) => {
      line.text = `${line.text.slice(0, range[0])}${replacement}${line.text.slice(range[1])}`;
      return line;
    }),
    append: vi.fn((text: string) => {
      line.text = `${line.text}${text}`;
      return line;
    }),
    prepend: vi.fn((prefix: string) => {
      line.text = `${prefix}${line.text}`;
      return line;
    }),
    prependBuffer: vi.fn((buffer: { text: string }) => {
      line.text = `${buffer.text}${line.text}`;
      return line;
    }),
    clone: vi.fn(() => createMockLine(line.text)),
  };

  return line;
}

export function createMockApi(options?: { room?: any }) {
  const triggers: RegisteredTrigger[] = [];
  const oneTimeTriggers: RegisteredOneTimeTrigger[] = [];
  const tokenTriggers: RegisteredTokenTrigger[] = [];
  const aliases: RegisteredAlias[] = [];
  const commandHooks: RegisteredCommandHook[] = [];
  const footerComponents: MockFooterComponent[] = [];
  const eventListeners = new Map<string, ((...args: unknown[]) => void)[]>();
  const room = options?.room;

  const filterInPlace = <T extends { tag?: string }>(list: T[], keep: (item: T) => boolean) => {
    const kept = list.filter(keep);
    list.length = 0;
    list.push(...kept);
  };

  const api = {
    colors: {
      fromHex: vi.fn((value: string) => ({ type: 'hex', value })),
    },
    triggers: {
      register: vi.fn((pattern, callback, tag, options?: TriggerOptions) => {
        const entry = { pattern, callback, tag, options };
        triggers.push(entry);
        return entry;
      }),
      registerOneTime: vi.fn((pattern, callback, tag, options?: TriggerOptions) => {
        const entry = { pattern, callback, tag, options };
        oneTimeTriggers.push(entry);
        return entry;
      }),
      registerToken: vi.fn((token: string, callback, tag, options?: TriggerOptions) => {
        const words = token.toLowerCase().split(TOKEN_SPLIT).filter((w) => w.length > 0);
        const entry = { token, words, callback, tag, options };
        tokenTriggers.push(entry);
        return entry;
      }),
      remove: vi.fn((trigger: unknown) => {
        filterInPlace(triggers, (t) => t !== trigger);
        filterInPlace(oneTimeTriggers, (t) => t !== trigger);
        filterInPlace(tokenTriggers, (t) => t !== trigger);
      }),
      removeByTag: vi.fn((tag: string) => {
        filterInPlace(triggers, (t) => t.tag !== tag);
        filterInPlace(oneTimeTriggers, (t) => t.tag !== tag);
        filterInPlace(tokenTriggers, (t) => t.tag !== tag);
      }),
    },
    aliases: {
      register: vi.fn((pattern, callback) => {
        aliases.push({ pattern, callback });
        return `alias-${aliases.length}`;
      }),
      remove: vi.fn(),
    },
    events: {
      emit: vi.fn((event: string, ...args: unknown[]) => {
        for (const listener of eventListeners.get(event) ?? []) {
          listener(...args);
        }
      }),
      on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
        const list = eventListeners.get(event) ?? [];
        list.push(listener);
        eventListeners.set(event, list);
      }),
      off: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
        const list = eventListeners.get(event);
        if (!list) return;
        const idx = list.indexOf(listener);
        if (idx >= 0) list.splice(idx, 1);
      }),
    },
    team: {
      getMembers: vi.fn((): string[] => []),
      getLeader: vi.fn((): string | undefined => undefined),
      getLeaderId: vi.fn((): number | undefined => undefined),
      getPlayerNum: vi.fn((): number | undefined => undefined),
    },
    bind: {
      set: vi.fn(),
      clear: vi.fn(),
      getLabel: vi.fn(() => 'CTRL+]'),
    },
    command: {
      send: vi.fn(),
    },
    gmcp: {
      get: vi.fn(() => ({})),
    },
    commandHooks: {
      register: vi.fn((callback, priority) => {
        commandHooks.push({ callback, priority });
        return `hook-${commandHooks.length}`;
      }),
      unregister: vi.fn(),
    },
    map: {
      getRoom: vi.fn(() => room),
      getRoomById: vi.fn(),
      getAreas: vi.fn(),
      findPath: vi.fn(),
      setLocation: vi.fn(),
      stepBack: vi.fn(),
      createHighlighter: vi.fn(),
    },
    output: {
      print: vi.fn(),
    },
    objectListFilters: {
      register: vi.fn(),
      unregister: vi.fn(),
    },
    ui: {
      registerFooterComponent: vi.fn((id: string, content: string, _position?: 'start' | 'end' | number) => {
        const handle = {
          element: {} as HTMLSpanElement,
          setContent: vi.fn(),
          setVisible: vi.fn(),
          remove: vi.fn(),
        };
        footerComponents.push({ id, initialContent: content, handle });
        return handle;
      }),
    },
    AnsiAwareBuffer: MockAnsiAwareBuffer,
  } as unknown as PluginApi;

  return { api, triggers, oneTimeTriggers, tokenTriggers, aliases, commandHooks, footerComponents, eventListeners };
}

export type MockApi = ReturnType<typeof createMockApi>;

/**
 * Dispatch a line of game output through the registered triggers, replicating
 * the client's pipeline (Triggers.parseLine): regular triggers in registration
 * order first, then token triggers matched via the tokenized-bucket walk.
 * Returns the final line object, or null when a trigger suppressed the line.
 *
 * Tests written against runLine stay valid whether a plugin registers a
 * pattern as a regex trigger or as a token trigger.
 */
export function runLine(mock: MockApi, text: string, type = 'output') {
  let line = createMockLine(text);
  const originalText = text;
  const plain = originalText.replace(/\s$/g, '');

  const matchPattern = (
    pattern: TriggerPattern,
    options: TriggerOptions | undefined,
  ): RegExpMatchArray | null | undefined => {
    const subPatterns = Array.isArray(pattern) ? pattern : [pattern];
    for (const sub of subPatterns) {
      let matches: RegExpMatchArray | null | undefined;
      if (sub instanceof RegExp) {
        const re = options?.caseInsensitive && !sub.flags.includes('i')
          ? new RegExp(sub.source, sub.flags + 'i')
          : sub;
        matches = plain.match(re);
      } else if (typeof sub === 'string') {
        const haystack = options?.caseInsensitive ? plain.toLowerCase() : plain;
        const needle = options?.caseInsensitive ? sub.toLowerCase() : sub;
        const index = haystack.indexOf(needle);
        if (index > -1) {
          matches = [plain.substring(index, index + sub.length)] as RegExpMatchArray;
          matches.index = index;
          matches.input = plain;
        }
      } else if (typeof sub === 'function') {
        matches = sub(line, null, type);
      }
      if (matches) return matches;
    }
    return null;
  };

  const applyCallback = (
    entry: { callback: RegisteredTrigger['callback'] },
    matches: RegExpMatchArray,
  ): 'dropped' | 'kept' => {
    const result = entry.callback(line, matches, type, originalText);
    if (result === null) return 'dropped';
    if (result && result !== line && typeof result.text === 'string' && typeof result.color === 'function') {
      line = result;
    }
    return 'kept';
  };

  for (const entry of [...mock.triggers]) {
    const matches = matchPattern(entry.pattern, entry.options);
    if (matches && applyCallback(entry, matches) === 'dropped') return null;
  }

  for (const entry of [...mock.oneTimeTriggers]) {
    const matches = matchPattern(entry.pattern, entry.options);
    if (!matches) continue;
    const idx = mock.oneTimeTriggers.indexOf(entry);
    if (idx >= 0) mock.oneTimeTriggers.splice(idx, 1);
    if (applyCallback(entry, matches) === 'dropped') return null;
  }

  if (mock.tokenTriggers.length > 0) {
    const loweredTokens = plain.split(TOKEN_SPLIT).filter((t) => t.length > 0).map((t) => t.toLowerCase());
    const seen = new Set<RegisteredTokenTrigger>();
    for (let i = 0; i < loweredTokens.length; i++) {
      const token = loweredTokens[i];
      for (const entry of [...mock.tokenTriggers]) {
        if (seen.has(entry) || entry.words.length === 0 || entry.words[0] !== token) continue;
        if (entry.words.length > loweredTokens.length - i) continue;
        let consecutive = true;
        for (let j = 1; j < entry.words.length; j++) {
          if (loweredTokens[i + j] !== entry.words[j]) {
            consecutive = false;
            break;
          }
        }
        if (!consecutive) continue;
        seen.add(entry);
        const matches = matchPattern(entry.token, entry.options);
        if (matches && applyCallback(entry, matches) === 'dropped') return null;
      }
    }
  }

  return line;
}
