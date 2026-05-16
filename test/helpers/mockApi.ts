import { vi } from 'vitest';
import type { PluginApi } from '@arkadia/plugin-types';

export class MockAnsiAwareBuffer {
  constructor(public text: string) {}
  color(_range: [number, number], _color: unknown): this {
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

export function createMockLine(text: string) {
  const line: any = {
    text,
    color: vi.fn((range) => ({ text: line.text, appliedRange: range })),
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
    },
    aliases: {
      register: vi.fn((pattern, callback) => {
        aliases.push({ pattern, callback });
        return `alias-${aliases.length}`;
      }),
    },
    events: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
    command: {
      send: vi.fn(),
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
    AnsiAwareBuffer: MockAnsiAwareBuffer,
  } as unknown as PluginApi;

  return { api, triggers, oneTimeTriggers, aliases, commandHooks };
}
