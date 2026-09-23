export type FooterChipTone = 'neutral' | 'ok' | 'warn' | 'danger';

interface FooterChipOptions {
  icon: string;
  label: string;
  value: string;
  tone?: FooterChipTone;
}

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );

/** Renders the markup expected by the client's native status-line chip styles. */
export function renderFooterChip({
  icon,
  label,
  value,
  tone = 'neutral',
}: FooterChipOptions): string {
  const toneClass = tone === 'neutral' ? '' : ` chip--${tone}`;

  return (
    `<span class="chip${toneClass}">` +
    `<span class="chip__ico" aria-hidden="true">${icon}</span>` +
    '<span class="chip__text">' +
    `<span class="chip__lab">${escapeHtml(label)}</span>` +
    `<span class="chip__val">${escapeHtml(value)}</span>` +
    '</span>' +
    '</span>'
  );
}

export const FOOTER_ICONS = {
  target:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="2"></circle><path d="M12 2v2M12 20v2M2 12h2M20 12h2"></path></svg>',
  sound:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M19 5a10 10 0 0 1 0 14"></path></svg>',
} as const;
