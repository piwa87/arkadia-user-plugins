import { describe, expect, it, vi } from 'vitest';
import { destroy as destroyCore, init as initCore } from '../src/plugins/core-plugin/index';
import { destroy as destroyDev, init as initDev } from '../src/plugins/development-plugin/index';
import { destroy as destroyRkg, init as initRkg } from '../src/plugins/rkg-plugin/index';
import { createMockApi } from './helpers/mockApi';

/**
 * The client tests every registered regex/string trigger against EVERY line of
 * game output (linear walk); token triggers are first-word-indexed and cost
 * ~nothing on non-matching lines. This budget keeps the per-line walk small —
 * if it fails after adding a trigger, prefer registerTokenGate/registerToken.
 *
 * Before the token-gate conversion the two plugins registered ~120 always-on
 * regex triggers; the remaining regular ones are anchored full-line parsers
 * (kondycje, zmeczenie) and literal-prefix room descriptions (bramy, walker).
 */
describe('per-line trigger budget', () => {
  it('keeps the always-on regex/string trigger count minimal', async () => {
    const core = createMockApi();
    await initCore(core.api);
    const dev = createMockApi();
    await initDev(dev.api);

    expect(core.triggers.length).toBeLessThanOrEqual(8);
    expect(dev.triggers.length).toBe(0);
    expect(core.oneTimeTriggers).toHaveLength(0);
    expect(dev.oneTimeTriggers).toHaveLength(0);

    // Sanity: the converted triggers actually registered as token gates.
    expect(core.tokenTriggers.length).toBeGreaterThan(60);
    expect(dev.tokenTriggers.length).toBeGreaterThan(20);

    await destroyCore();
    destroyDev();
  });

  it('keeps rkg-plugin off the per-line walk entirely', async () => {
    // rkg-plugin registers nothing at init: the dialogue's parsers are armed on
    // demand and live only for the duration of a run.
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    });

    const rkg = createMockApi();
    await initRkg(rkg.api);

    expect(rkg.triggers).toHaveLength(0);
    expect(rkg.oneTimeTriggers).toHaveLength(0);
    expect(rkg.tokenTriggers).toHaveLength(0);

    await destroyRkg();
  });
});
