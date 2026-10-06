import { describe, expect, it } from 'vitest';
import { setupPustyniaKierunki } from '../../../../src/plugins/core-plugin/pustynia/kierunki';
import { createMockApi, runLine } from '../../../helpers/mockApi';

describe('desert landmark directions', () => {
  it.each([
    ['Podroz na polnocny-zachod uniemozliwia nieprzebyty masyw gorski.', '[MASYW]: NW'],
    ['Podroz na polnoc i polnocny-zachod uniemozliwia nieprzebyty masyw gorski.', '[MASYW]: N, NW'],
    ['Mury miejskie nie pozwalaja ci isc na poludniowy-wschod.', '[MURY]: SE'],
    ['Mury miejskie nie pozwalaja ci isc na wschod.', '[MURY]: E'],
    ['Mury miejskie nie pozwalaja ci isc na polnocny-wschod.', '[MURY]: NE'],
    ['Mury miejskie nie pozwalaja ci isc na wschod i poludnie.', '[MURY]: E, S'],
    ['Szeroka rozpadlina rozciaga sie po pustyni, czyniac podroz na poludniowy-wschod i poludnie niemozliwa.', '[ROZPADLINA]: SE, S'],
    ['Szeroka rozpadlina rozciaga sie po pustyni, czyniac podroz na polnoc niemozliwa.', '[ROZPADLINA]: N'],
  ])('formats standalone landmark: %s', (text, expected) => {
    const mock = createMockApi();
    setupPustyniaKierunki(mock.api);
    expect(runLine(mock, text)?.text).toBe(expected);
    expect(mock.api.output.print).not.toHaveBeenCalled();
  });

  it.each([
    ['polnoc', 'N'], ['poludnie', 'S'], ['wschod', 'E'], ['zachod', 'W'],
    ['polnocny-wschod', 'NE'], ['polnocny-zachod', 'NW'],
    ['poludniowy-wschod', 'SE'], ['poludniowy-zachod', 'SW'],
  ])('abbreviates %s without splitting diagonal directions', (direction, abbreviation) => {
    const mock = createMockApi();
    setupPustyniaKierunki(mock.api);
    const line = runLine(mock, `Szeroka rozpadlina zagradza droge na ${direction}, a mury wielkiego miasta - poludniowy-wschod.`);
    expect(line?.text).toBe(`[ROZPADLINA]: ${abbreviation}   +   [MURY]: SE`);
    expect(mock.api.output.print).not.toHaveBeenCalled();
  });

  it('handles reversed landmarks and multiple directions for each', () => {
    const mock = createMockApi();
    setupPustyniaKierunki(mock.api);
    const line = runLine(mock, 'Mury wielkiego miasta zagradzaja droge na poludnie, poludniowy-wschod oraz wschod, a szeroka rozpadlina - polnocny-zachod i na polnoc.');
    expect(line?.text).toBe('[ROZPADLINA]: NW, N   +   [MURY]: S, SE, E');
  });

  it.each([
    ['Masyw gorski czyni niemozliwa podroz na poludniowy-zachod, a szeroka rozpadlina - zachod i polnocny-zachod.', '[ROZPADLINA]: W, NW   +   [MASYW]: SW'],
    ['Szeroka rozpadlina zagradza droge na zachod i polnocny-zachod, a masyw gorski - poludniowy-zachod.', '[ROZPADLINA]: W, NW   +   [MASYW]: SW'],
    ['Masyw gorski czyni niemozliwa podroz na polnoc, a mury wielkiego miasta - poludnie.', '[MURY]: S   +   [MASYW]: N'],
  ])('formats mountains with another landmark in fixed order: %s', (text, expected) => {
    const mock = createMockApi();
    setupPustyniaKierunki(mock.api);
    expect(runLine(mock, text)?.text).toBe(expected);
    expect(mock.api.output.print).not.toHaveBeenCalled();
  });

  it('handles the observed description with two directions for each landmark', () => {
    const mock = createMockApi();
    setupPustyniaKierunki(mock.api);
    const line = runLine(mock, 'Szeroka rozpadlina zagradza droge na poludniowy-wschod i poludnie, a mury wielkiego miasta - polnocny-wschod i polnocny-zachod.');
    expect(line?.text).toBe('[ROZPADLINA]: SE, S   +   [MURY]: NE, NW');
  });

  it.each([
    'Szeroka rozpadlina zagradza droge na polnocny-zachod.',
    'Mimo odczuwalnego trudu pustynnej podrozy ruszasz dalej w dol zbocza rozpadliny.',
    'W pustynnej rozpadlinie.',
    '====] E SE',
    'Podroz na nieznany-kierunek uniemozliwia nieprzebyty masyw gorski.',
    'Masyw gorski czyni niemozliwa podroz na polnoc, a masyw gorski - poludnie.',
    'Mury miejskie nie pozwalaja ci isc na nieznany-kierunek.',
    'Szeroka rozpadlina zagradza droge na nieznany-kierunek, a mury wielkiego miasta - poludnie.',
    'Szeroka rozpadlina zagradza droge na polnoc i cos jeszcze, a mury wielkiego miasta - poludnie.',
    'Szeroka rozpadlina zagradza droge na polnoc, a szeroka rozpadlina - poludnie.',
    'Mowisz: Szeroka rozpadlina zagradza droge na polnoc, a mury wielkiego miasta - poludnie.',
  ])('preserves incomplete or unrelated text: %s', (text) => {
    const mock = createMockApi();
    setupPustyniaKierunki(mock.api);
    expect(runLine(mock, text)?.text).toBe(text);
  });
});
