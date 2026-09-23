import { describe, expect, it } from 'vitest';
import { FOOTER_ICONS, renderFooterChip } from '../../src/lib/footerChip';

describe('renderFooterChip', () => {
  it('uses the native footer chip structure', () => {
    const result = renderFooterChip({
      icon: FOOTER_ICONS.sound,
      label: 'DZWIEK',
      value: 'ON',
      tone: 'ok',
    });

    expect(result).toContain('class="chip chip--ok"');
    expect(result).toContain('class="chip__ico"');
    expect(result).toContain('class="chip__lab">DZWIEK');
    expect(result).toContain('class="chip__val">ON');
  });

  it('escapes footer text', () => {
    const result = renderFooterChip({
      icon: FOOTER_ICONS.target,
      label: 'CEL',
      value: '<script>alert("x")</script>',
    });

    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });
});
