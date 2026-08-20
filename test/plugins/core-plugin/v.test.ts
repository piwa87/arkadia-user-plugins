import { describe, expect, it } from 'vitest';
import { createMockApi, type MockApi } from '../../helpers/mockApi';
import { setupPrzelamAliases } from '../../../src/plugins/core-plugin/walka/v';

function runAlias(mock: MockApi, command: string): void {
  for (const alias of mock.aliases) {
    const matches = command.match(alias.pattern);
    if (matches) {
      alias.callback(matches);
      return;
    }
  }
  throw new Error(`brak aliasu dla: ${command}`);
}

function sentCommands(mock: MockApi): string[] {
  return (mock.api.command.send as ReturnType<typeof vi.fn>).mock.calls.map(([command]) => command);
}

describe('v aliases', () => {
  it('uses /prze for the current target and for an explicit id', () => {
    const mock = createMockApi();
    setupPrzelamAliases(mock.api);

    runAlias(mock, 'v');
    expect(sentCommands(mock)).toEqual(['/prze']);

    (mock.api.command.send as ReturnType<typeof vi.fn>).mockClear();
    runAlias(mock, 'v123');
    expect(sentCommands(mock)).toEqual(['/prze 123']);
  });

  it('keeps the solo vv and vc sequences while using /prze', () => {
    const mock = createMockApi();
    setupPrzelamAliases(mock.api);

    runAlias(mock, 'vv 123');
    expect(sentCommands(mock)).toEqual(['/prze 123', 'rozkaz druzynie zaatakowac 123']);

    (mock.api.command.send as ReturnType<typeof vi.fn>).mockClear();
    runAlias(mock, 'vc');
    expect(sentCommands(mock)).toEqual(['/prze', 'zabij cel ataku', 'kondycja wszystkich']);
  });

  it('keeps the follower vv sequence around /prze', () => {
    const mock = createMockApi();
    (mock.api.team.getMembers as ReturnType<typeof vi.fn>).mockReturnValue(['Vindael', 'Soroko']);
    (mock.api.team.getLeaderId as ReturnType<typeof vi.fn>).mockReturnValue(1);
    (mock.api.team.getPlayerNum as ReturnType<typeof vi.fn>).mockReturnValue(2);
    setupPrzelamAliases(mock.api);

    runAlias(mock, 'vv 123');
    expect(sentCommands(mock)).toEqual(['rozkaz druzynie zaatakowac 123', '/prze 123', 'c 123']);
  });
});
