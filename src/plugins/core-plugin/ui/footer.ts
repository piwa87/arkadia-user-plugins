import type { PluginApi } from '@arkadia/plugin-types';
import { col8 } from '../../../lib/my-colors';

export function setupFooter(
  api: PluginApi,
  targets: string[],
): {
  update: () => void;
} {
  const renderContent = () => {
    if (!targets[0]) return '';
    return `CEL: <span style="color: ${col8};">${targets[0]}</span>`;
  };

  const footerHandle = api.ui.registerFooterComponent('targets', renderContent(), 'start');

  const update = () => {
    footerHandle.setContent(renderContent());
  };

  return { update };
}
