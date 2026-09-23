import type { PluginApi } from '@arkadia/plugin-types';
import { FOOTER_ICONS, renderFooterChip } from '../../../lib/footerChip';

export function setupFooter(
  api: PluginApi,
  targets: string[],
): {
  update: () => void;
} {
  const renderContent = () => {
    if (!targets[0]) return '';
    return renderFooterChip({
      icon: FOOTER_ICONS.target,
      label: 'CEL',
      value: targets[0],
    });
  };

  const footerHandle = api.ui.registerFooterComponent('targets', renderContent(), 'start');

  const update = () => {
    footerHandle.setContent(renderContent());
  };

  return { update };
}
