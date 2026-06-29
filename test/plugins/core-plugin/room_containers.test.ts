import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockApi } from '../../helpers/mockApi';
import { setupRoomContainers } from '../../../src/plugins/core-plugin/room_containers';

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageMock());
});

function findAlias(aliases: { pattern: RegExp }[], input: string) {
  return aliases.find((a) => a.pattern.test(input));
}

function fire(
  aliases: { pattern: RegExp; callback: (m?: RegExpMatchArray) => boolean | void }[],
  input: string,
) {
  const alias = aliases.find((a) => a.pattern.test(input));
  if (!alias) throw new Error(`no alias for: ${input}`);
  return alias.callback(input.match(alias.pattern) ?? undefined);
}

describe('setupRoomContainers', () => {
  it('falls back to the default chest when the room has no override', () => {
    const { api, aliases } = createMockApi({ room: { id: 100 } });
    setupRoomContainers(api);

    fire(aliases, 'pj kamienie');
    expect(api.command.send).toHaveBeenCalledWith('otworz skrzynie');
    expect(api.command.send).toHaveBeenCalledWith('przejrzyj kamienie');
  });

  it('we/wl use the default nominative + genitive', () => {
    const { api, aliases } = createMockApi({ room: { id: 100 } });
    setupRoomContainers(api);

    fire(aliases, 'we miecz');
    expect(api.command.send).toHaveBeenCalledWith('otworz skrzynie');
    expect(api.command.send).toHaveBeenCalledWith('wez miecz z skrzyni');

    (api.command.send as ReturnType<typeof vi.fn>).mockClear();

    fire(aliases, 'wl tarcza');
    expect(api.command.send).toHaveBeenCalledWith('otworz skrzynie');
    expect(api.command.send).toHaveBeenCalledWith('wloz tarcza do skrzyni');
  });

  it('binds a room-specific container with pj+ and uses it for pj/we/wl', () => {
    const { api, aliases } = createMockApi({ room: { id: 42 } });
    setupRoomContainers(api);

    fire(aliases, 'pj+ kufer|kufra');
    (api.command.send as ReturnType<typeof vi.fn>).mockClear();

    fire(aliases, 'pj');
    expect(api.command.send).toHaveBeenCalledWith('otworz kufer');
    expect(api.command.send).toHaveBeenCalledWith('przejrzyj');

    fire(aliases, 'we sztylet');
    expect(api.command.send).toHaveBeenCalledWith('wez sztylet z kufra');

    fire(aliases, 'wl sztylet');
    expect(api.command.send).toHaveBeenCalledWith('wloz sztylet do kufra');
  });

  it('persists the binding across a fresh setup (localStorage)', () => {
    const first = createMockApi({ room: { id: 7 } });
    setupRoomContainers(first.api);
    fire(first.aliases, 'pj+ depozyt|depozytu');

    const second = createMockApi({ room: { id: 7 } });
    setupRoomContainers(second.api);
    fire(second.aliases, 'we klejnot');
    expect(second.api.command.send).toHaveBeenCalledWith('otworz depozyt');
    expect(second.api.command.send).toHaveBeenCalledWith('wez klejnot z depozytu');
  });

  it('reuses a single form for both cases when no | is given', () => {
    const { api, aliases } = createMockApi({ room: { id: 9 } });
    setupRoomContainers(api);

    fire(aliases, 'pj+ beczka');
    fire(aliases, 'we jablko');
    expect(api.command.send).toHaveBeenCalledWith('otworz beczka');
    expect(api.command.send).toHaveBeenCalledWith('wez jablko z beczka');
  });

  it('pj- reverts a room to the default container', () => {
    const { api, aliases } = createMockApi({ room: { id: 5 } });
    setupRoomContainers(api);

    fire(aliases, 'pj+ kufer|kufra');
    fire(aliases, 'pj-');
    (api.command.send as ReturnType<typeof vi.fn>).mockClear();

    fire(aliases, 'pj');
    expect(api.command.send).toHaveBeenCalledWith('otworz skrzynie');
  });

  it('does not save when the room id is unknown', () => {
    const { api, aliases } = createMockApi({ room: undefined });
    setupRoomContainers(api);

    fire(aliases, 'pj+ kufer|kufra');
    expect(api.output.print).toHaveBeenCalledWith(
      expect.stringContaining('nieznany pokoj'),
    );
  });

  it('pj+ and pj? do not collide with the bare pj alias', () => {
    const { api, aliases } = createMockApi({ room: { id: 1 } });
    setupRoomContainers(api);
    // pj+ should be matched by the pj+ alias, not the bare pj alias
    const plainPj = aliases.find(
      (a) => a.pattern.source === /^pj(?:\s+(.+))?$/.source,
    );
    expect(plainPj).toBeDefined();
    expect(plainPj!.pattern.test('pj+ kufer|kufra')).toBe(false);
    expect(plainPj!.pattern.test('pj?')).toBe(false);
    expect(findAlias(aliases, 'pj kamienie')).toBe(plainPj);
  });
});
