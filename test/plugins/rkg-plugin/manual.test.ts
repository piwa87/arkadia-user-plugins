import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { init, destroy } from '../../../src/plugins/rkg-plugin';
import { createMockApi, runLine } from '../../helpers/mockApi';
import { storage } from '../../../src/lib/storage';
import type { WpisLokalny } from '../../../src/shared/rkg-api';
import { walidujZgloszenie } from '../../../api/src/validate';

function makeLocalStorageMock() {
  const data: Record<string, string> = {};
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => { data[k] = v; },
    removeItem: (k: string) => { delete data[k]; },
    clear: () => { for (const k in data) delete data[k]; },
  };
}

beforeEach(() => vi.stubGlobal('localStorage', makeLocalStorageMock()));
afterEach(async () => { await destroy(); vi.unstubAllGlobals(); });

describe('rkgman!', () => {
  it('captures the player\'s answers, saves the game summary, and cancels creation', async () => {
    const mock = createMockApi();
    await init(mock.api);
    const alias = mock.aliases.find((a) => a.pattern.test('rkgman!'))!;
    alias.callback('rkgman!'.match(alias.pattern) as RegExpMatchArray);
    const answer = (prompt: string, value: string) => {
      runLine(mock, prompt);
      const hook = mock.commandHooks[mock.commandHooks.length - 1];
      expect(hook).toBeDefined();
      expect(hook.callback(value)).toBeUndefined();
    };
    answer('Jaki charakter ma miec klub?', 'niejawny');
    answer('Jakiego typu ma to byc klub?', 'klub');
    answer('Jakiej plci maja byc czlonkowie?', 'dowolnej');
    answer('Jaka ma byc nazwa klubu?', 'nazwa');
    answer('Podaj rzeczownik lub wyswietl', 'kot');
    answer('Podaj przymiotnik', 'kupiecki');
    answer('Nazwa klubu ma byc w liczbie pojedynczej czy mnogiej?', 'mnogiej');
    answer('W jakim przypadku gramatycznym?', 'dopelniaczu');
    answer('Wybierz symbol klubu', 'pomin');
    for (const line of [
      'Podsumowujac, nowy klub bedzie sie nazywal:',
      '\tKlub Kupieckich Kotow',
      'Przywodca bedzie nosil tytul:',
      '\tPrzywodca Klubu Kupieckich Kotow',
      'Zastepca przywodcy bedzie nosil tytul:',
      '\tZaufany w Klubie Kupieckich Kotow',
      'Szeregowy czlonek klubu bedzie nosil tytul:',
      '\tUczestnik Klubu Kupieckich Kotow',
      'Czy chcesz stworzyc taki klub?',
    ]) runLine(mock, line);

    const sent = (mock.api.command.send as any).mock.calls.map(([cmd]: [string]) => cmd);
    expect(sent).toEqual(['utworz klub', '**']);
    const wpis = storage.get<WpisLokalny[]>('rkg:wpisy')?.[0];
    expect(wpis).toMatchObject({
      typ: 'klub', przymiotnik: 'kupiecki', rzeczownik: 'kot',
      liczba: 'mnogiej', przypadek: 'dopelniaczu', charakter: 'niejawny',
      tryb: 'manualny', wynik: 'Klub Kupieckich Kotow',
      role: {
        przywodca: 'Przywodca Klubu Kupieckich Kotow',
        zastepca: 'Zaufany w Klubie Kupieckich Kotow',
        czlonek: 'Uczestnik Klubu Kupieckich Kotow',
      },
    });
    expect(mock.commandHooks).toHaveLength(0);
    expect(mock.tokenTriggers).toHaveLength(0);
    expect(mock.triggers).toHaveLength(0);
  });

  it('accepts a manual adjective on the wall while keeping generated submissions strict', () => {
    const data = {
      typ: 'klub', przymiotnik: 'kupiecki', rzeczownik: 'kot',
      liczba: 'mnogiej', przypadek: 'dopelniaczu',
      wynik: 'Klub Kupieckich Kotow', glosujacy: 'manual-device-1',
    };
    expect(walidujZgloszenie(data)).toMatchObject({ ok: false, blad: 'nieznany przymiotnik' });
    expect(walidujZgloszenie({ ...data, tryb: 'manualny' })).toMatchObject({ ok: true });
  });

  it('removes its temporary listeners when the player stops the dialogue', async () => {
    const mock = createMockApi();
    await init(mock.api);
    const start = mock.aliases.find((a) => a.pattern.test('rkgman!'))!;
    start.callback('rkgman!'.match(start.pattern) as RegExpMatchArray);
    runLine(mock, 'Podaj rzeczownik lub wyswietl');
    const stop = mock.aliases.find((a) => a.pattern.test('rkg-'))!;
    stop.callback('rkg-'.match(stop.pattern) as RegExpMatchArray);
    expect(mock.commandHooks).toHaveLength(0);
    expect(mock.tokenTriggers).toHaveLength(0);
    expect(mock.triggers).toHaveLength(0);
    expect(storage.get<WpisLokalny[]>('rkg:wpisy') ?? []).toHaveLength(0);
  });

  it('restores input handling when the connection drops mid-dialogue', async () => {
    class FakeInput {
      type = 'password';
      autocomplete = 'off';
    }
    const input = new FakeInput();
    vi.stubGlobal('HTMLInputElement', FakeInput);
    vi.stubGlobal('document', { getElementById: () => input });
    vi.stubGlobal('MutationObserver', undefined);
    const mock = createMockApi();
    await init(mock.api);
    const start = mock.aliases.find((a) => a.pattern.test('rkgman!'))!;
    start.callback('rkgman!'.match(start.pattern) as RegExpMatchArray);
    expect(input.type).toBe('text');
    mock.api.events.emit('client.disconnect');
    expect(input.type).toBe('password');
    expect(mock.commandHooks).toHaveLength(0);
    expect(mock.tokenTriggers).toHaveLength(0);
  });
});
