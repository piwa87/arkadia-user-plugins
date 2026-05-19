import type { PluginApi } from '@arkadia/plugin-types';

interface RaState {
  enemies?: any[];
  keygivers?: any[];
  [key: string]: any;
}

function cecho(api: PluginApi, text: string): void {
  api.output.print(text);
}

export function setupWindow(api: PluginApi, state: RaState): () => void {
  let currentPopup: any = null;

  const createPopupContent = (): HTMLElement => {
    const container = document.createElement('div');
    container.className = 'ra-popup-content';
    container.style.padding = '10px';
    container.style.fontFamily = 'monospace';
    container.style.fontSize = '12px';

    const title = document.createElement('div');
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    title.style.fontSize = '14px';
    title.textContent = 'Alderazzi RA Panel';

    const content = document.createElement('div');
    content.style.whiteSpace = 'pre-wrap';
    content.style.wordWrap = 'break-word';

    let info = 'Alderazzi RA Plugin\n';
    info += '==================\n\n';
    info += 'Dostepne komendy:\n';
    info += '/czas - Wydarzenia kalendarza\n';
    info += '/bretonia - Eksploracja Bretonii\n';
    info += '/bretonia-stop - Stop eksploracji\n';
    info += '/mpokaz - Pokaz cene towaru\n';
    info += '/ra_okno - Toggle okno\n';
    info += '/ra_pomoc - Pomoc pluginu\n\n';

    if (state.enemies && state.enemies.length > 0) {
      info += `Obecni Wrogowie (${state.enemies.length}):\n`;
      info += '---\n';
      for (const enemy of state.enemies.slice(0, 5)) {
        info += `${enemy.name}\n`;
      }
      if (state.enemies.length > 5) {
        info += `... i ${state.enemies.length - 5} wiecej\n`;
      }
      info += '\n';
    }

    if (state.keygivers && state.keygivers.length > 0) {
      info += `Kluczodajki (${state.keygivers.length}):\n`;
      info += '---\n';
      for (const kg of state.keygivers.slice(0, 5)) {
        info += `${kg.name}\n`;
      }
      if (state.keygivers.length > 5) {
        info += `... i ${state.keygivers.length - 5} wiecej\n`;
      }
    }

    content.textContent = info;
    container.appendChild(title);
    container.appendChild(content);
    return container;
  };

  (async () => {
    currentPopup = await api.ui.registerPersistentPopup({
      id: 'ra-window',
      title: 'Alderazzi RA',
      createContent: async () => createPopupContent()
    });
  })();

  const menuLabel = document.createElement('div');
  menuLabel.className = 'd-flex align-items-center justify-content-center gap-1 w-100';
  menuLabel.textContent = 'Alderazzi RA';
  api.ui.addPopupMenuEntry(menuLabel, () => {
    if (currentPopup && !currentPopup.isOpen) {
      currentPopup.open();
    }
  });

  api.aliases.register(/^\/ra_okno$/, () => {
    if (currentPopup) {
      if (currentPopup.isOpen) {
        currentPopup.close();
      } else {
        currentPopup.open();
      }
    }
    return true;
  });

  api.aliases.register(/^\/ra_okno_odswiez$/, () => {
    if (currentPopup) {
      currentPopup.setBody(createPopupContent());
    }
    cecho(api, '\n<green>Odswiezono okno.\n');
    return true;
  });

  return () => {
    if (currentPopup && currentPopup.isOpen) {
      currentPopup.close();
    }
    currentPopup = null;
  };
}
