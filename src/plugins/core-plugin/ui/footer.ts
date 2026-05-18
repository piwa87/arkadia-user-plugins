import type { PluginApi } from '@arkadia/plugin-types';
import { c9 } from '../../../lib/colors';

export function setupFooter(
  api: PluginApi,
  targets: string[],
): {
  update: () => void;
} {
  const renderContent = () => {
    if (!targets[0]) return '';
    return `CEL: <span style="color: ${c9};">${targets[0]}</span>`;
  };

  const footerHandle = api.ui.registerFooterComponent('targets', renderContent(), 'start');

  const update = () => {
    footerHandle.setContent(renderContent());
  };

  return { update };
}
