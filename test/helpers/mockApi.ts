import { vi } from 'vitest';
import type { PluginApi } from '@arkadia/plugin-types';

export interface RegisteredTrigger {
  pattern: RegExp | string;
  callback: (line: any, matches: RegExpMatchArray, type?: string) => any;
  tag: string;
}

export interface RegisteredAlias {
  pattern: RegExp;
  callback: (matches?: RegExpMatchArray) => boolean | void;
}

export function createMockLine(text: string) {
  return {
    text,
    color: vi.fn((range) => ({ text, appliedRange: range })),
  };
}

export function createMockApi() {
  const triggers: RegisteredTrigger[] = [];
  const aliases: RegisteredAlias[] = [];

  const api = {
    colors: {
      fromHex: vi.fn((value: string) => ({ type: 'hex', value })),
    },
    triggers: {
      register: vi.fn((pattern, callback, tag) => {
        triggers.push({ pattern, callback, tag });
        return { pattern, callback, tag };
      }),
    },
    aliases: {
      register: vi.fn((pattern, callback) => {
        aliases.push({ pattern, callback });
        return `alias-${aliases.length}`;
      }),
    },
    command: {
      send: vi.fn(),
    },
  } as unknown as PluginApi;

  return { api, triggers, aliases };
}
