import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupDylizansy } from '../../../src/plugins/core-plugin/movement/dylizansy';
import { setupGlassSounds } from '../../../src/plugins/core-plugin/sounds/glass_sound';
import { createMockApi, runLine } from '../../helpers/mockApi';

afterEach(() => vi.unstubAllGlobals());

describe('dylizansy', () => {
  it.each([
    ['centrum wioski Montlac.', 'Centrum wioski Montlac.'],
    ['w wiosce Merceaux-Descloux.', 'W wiosce Merceaux-Descloux.'],
  ])('notifies with the description after Postoj and adds the transport prefix: %s', (stop, expected) => {
    const notification = vi.fn();
    vi.stubGlobal('Notification', Object.assign(notification, { permission: 'granted' }));
    const mock = createMockApi();
    setupGlassSounds(mock.api);
    setupDylizansy(mock.api);

    const announcement = `Z zewnatrz dochodzi stlumiony glos woznicy: Postoj, ${stop}`;
    expect(runLine(mock, announcement)?.text).toBe(`[transport] ${announcement}`);
    expect(notification).toHaveBeenCalledExactlyOnceWith(`🚏 ${expected}`);
    expect(mock.api.output.print).not.toHaveBeenCalled();
  });

  it('notifies with the announced stop and leaves the game line visible', () => {
    const notification = vi.fn();
    vi.stubGlobal('Notification', Object.assign(notification, { permission: 'granted' }));
    const mock = createMockApi();
    setupDylizansy(mock.api);

    const announcement = 'Z zewnatrz slyszysz glos woznicy: Fermata - Ebino!';
    expect(runLine(mock, announcement)?.text).toBe(announcement);
    expect(notification).toHaveBeenCalledExactlyOnceWith('🚏 Ebino!');

    runLine(mock, 'Z zewnatrz slyszysz glos woznicy: Przystanek - zielona morda');
    expect(notification).toHaveBeenLastCalledWith('🚏 Zielona morda');

    runLine(mock, 'Z zewnatrz slyszysz glos woznicy.');
    expect(notification).toHaveBeenCalledTimes(2);
  });

  it('ignores departure announcements after notifying about a stop', () => {
    const notification = vi.fn();
    vi.stubGlobal('Notification', Object.assign(notification, { permission: 'granted' }));
    const mock = createMockApi();
    setupDylizansy(mock.api);

    runLine(mock, 'Z zewnatrz slyszysz glos woznicy: Fermata - Campogrotta!');
    expect(notification).toHaveBeenCalledExactlyOnceWith('🚏 Campogrotta!');

    const departure = 'Z zewnatrz slyszysz glos woznicy: Partire per Varieno in qualche minuti!';
    expect(runLine(mock, departure)?.text).toBe(departure);
    expect(notification).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['fermata - Ebino!', 'Ebino!'],
    ['przystanek - zielona morda', 'Zielona morda'],
  ])(
    'recognizes the stop announcement regardless of capitalization: %s',
    (stop, expected) => {
      const notification = vi.fn();
      vi.stubGlobal('Notification', Object.assign(notification, { permission: 'granted' }));
      const mock = createMockApi();
      setupDylizansy(mock.api);

      runLine(mock, `Z zewnatrz slyszysz glos woznicy: ${stop}`);
      expect(notification).toHaveBeenCalledExactlyOnceWith(`🚏 ${expected}`);
    },
  );

  it.each(['Miragliano', 'Viadaza', 'Urbimo'])(
    'shows only the capitalized text after the dash for %s',
    (destination) => {
      const notification = vi.fn();
      vi.stubGlobal('Notification', Object.assign(notification, { permission: 'granted' }));
      const mock = createMockApi();
      setupDylizansy(mock.api);

      const announcement = `Z zewnatrz slyszysz glos woznicy: Fermata - incrocio alla ${destination}!`;
      expect(runLine(mock, announcement)?.text).toBe(announcement);
      expect(notification).toHaveBeenCalledExactlyOnceWith(`🚏 Incrocio alla ${destination}!`);
    },
  );
});
