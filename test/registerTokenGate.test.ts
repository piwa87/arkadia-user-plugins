import { describe, expect, it, vi } from 'vitest';
import { registerTokenGate } from '../src/lib/registerTokenGate';
import { createMockApi, runLine } from './helpers/mockApi';

describe('registerTokenGate', () => {
  it('fires the callback when a gate word is present and the pattern matches', () => {
    const mock = createMockApi();
    let captured: RegExpMatchArray | undefined;
    const cb = vi.fn((line: unknown, matches: RegExpMatchArray) => {
      captured = matches;
      return line;
    });
    registerTokenGate(mock.api, 'brama', /^(.*) brama zamyka sie\.$/, cb as never, 'tag');

    runLine(mock, 'Wielka brama zamyka sie.');
    expect(cb).toHaveBeenCalledTimes(1);
    expect(captured?.[1]).toBe('Wielka');
  });

  it('does not fire when the gate word is present but the pattern does not match', () => {
    const mock = createMockApi();
    const cb = vi.fn((line) => line);
    registerTokenGate(mock.api, 'brama', /^(.*) brama zamyka sie\.$/, cb, 'tag');

    runLine(mock, 'Brama do miasta jest daleko.');
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires only once when a line contains several gate words', () => {
    const mock = createMockApi();
    const cb = vi.fn((line) => line);
    registerTokenGate(mock.api, ['opada', 'zamykajac'], /krata opada, zamykajac/, cb, 'tag');

    runLine(mock, 'Ciezka krata opada, zamykajac przejscie.');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires again on a new line with identical text', () => {
    const mock = createMockApi();
    const cb = vi.fn((line) => line);
    registerTokenGate(mock.api, ['opada', 'zamykajac'], /krata opada, zamykajac/, cb, 'tag');

    runLine(mock, 'Ciezka krata opada, zamykajac przejscie.');
    runLine(mock, 'Ciezka krata opada, zamykajac przejscie.');
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('matches gate words case-insensitively', () => {
    const mock = createMockApi();
    const cb = vi.fn((line) => line);
    registerTokenGate(mock.api, 'sarkofag', /Sarkofag wykonany jest/, cb, 'tag');

    runLine(mock, 'Sarkofag wykonany jest z czarnego kamienia.');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('tries patterns in order and uses the first match', () => {
    const mock = createMockApi();
    const seen: string[] = [];
    registerTokenGate(
      mock.api,
      'wypala',
      [/(.* pochodnia) wypala sie/, /(.* swieca) wypala sie/],
      (line, matches) => {
        seen.push(matches[1]);
        return line;
      },
      'tag',
    );

    runLine(mock, 'Stara pochodnia wypala sie i gasnie.');
    runLine(mock, 'Woskowa swieca wypala sie i gasnie.');
    expect(seen).toEqual(['Stara pochodnia', 'Woskowa swieca']);
  });

  it('supports suppressing the line by returning null', () => {
    const mock = createMockApi();
    registerTokenGate(mock.api, 'spam', /^spam line$/, () => null, 'tag');

    expect(runLine(mock, 'spam line')).toBeNull();
    expect(runLine(mock, 'normal line')).not.toBeNull();
  });

  it('is removable via removeByTag', () => {
    const mock = createMockApi();
    const cb = vi.fn((line) => line);
    registerTokenGate(mock.api, ['a1', 'a2'], /x/, cb, 'gateTag');
    expect(mock.tokenTriggers).toHaveLength(2);

    mock.api.triggers.removeByTag('gateTag');
    expect(mock.tokenTriggers).toHaveLength(0);
  });
});
