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

export interface RegisteredTrigger {
  pattern: RegExp | string;
  callback: (line: any, matches: RegExpMatchArray, type?: string) => any;
  tag: string;
}

export interface RegisteredOneTimeTrigger {
  pattern: RegExp | string;
  callback: (line: any, matches: RegExpMatchArray, type?: string) => any;
  tag: string;
}

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
    color: vi.fn((range) => ({ text: line.text, appliedRange: range })),
    colorWords: vi.fn(() => line),
    replace: vi.fn((range: [number, number], replacement: string) => {
      line.text = `${line.text.slice(0, range[0])}${replacement}${line.text.slice(range[1])}`;
      return line;
    }),
    clone: vi.fn(() => createMockLine(line.text)),
  };

  return line;
}

export function createMockApi(options?: { room?: any }) {
  const triggers: RegisteredTrigger[] = [];
  const oneTimeTriggers: RegisteredOneTimeTrigger[] = [];
  const aliases: RegisteredAlias[] = [];
  const commandHooks: RegisteredCommandHook[] = [];
  const footerComponents: MockFooterComponent[] = [];
  const eventListeners = new Map<string, ((...args: unknown[]) => void)[]>();
  const room = options?.room;

  const api = {
    colors: {
      fromHex: vi.fn((value: string) => ({ type: 'hex', value })),
    },
    triggers: {
      register: vi.fn((pattern, callback, tag) => {
        triggers.push({ pattern, callback, tag });
        return { pattern, callback, tag };
      }),
      registerOneTime: vi.fn((pattern, callback, tag) => {
        oneTimeTriggers.push({ pattern, callback, tag });
        return { pattern, callback, tag };
      }),
      remove: vi.fn((trigger: unknown) => {
        const idx = triggers.findIndex(
          (t) => t.pattern === (trigger as any)?.pattern && t.callback === (trigger as any)?.callback,
        );
        if (idx >= 0) triggers.splice(idx, 1);
      }),
      removeByTag: vi.fn((tag: string) => {
        const keep = triggers.filter((t) => t.tag !== tag);
        triggers.length = 0;
        triggers.push(...keep);
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

  return { api, triggers, oneTimeTriggers, aliases, commandHooks, footerComponents, eventListeners };
}
