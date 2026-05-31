import type { PluginApi } from '@arkadia/plugin-types';

// Keyboard grid mapped to compass/movement (Ctrl + key):
//   7  8  9  →  nw    n   ne
//   u  i  o  →   w    ·    e    (i = configurable action, see setCenterCommand)
//   j  k  l  →  sw    s   se
//   6        →   u (up)
//   y        →   d (down)
//   0        →   special exit (first exit in current room)
const DIRECTION_BINDINGS: Array<{ code: string; direction: string }> = [
  { code: 'Digit7', direction: 'nw' },
  { code: 'Digit8', direction: 'n' },
  { code: 'Digit9', direction: 'ne' },
  { code: 'KeyU', direction: 'w' },
  { code: 'KeyO', direction: 'e' },
  { code: 'KeyJ', direction: 'sw' },
  { code: 'KeyK', direction: 's' },
  { code: 'KeyL', direction: 'se' },
  { code: 'Digit6', direction: 'u' },
  { code: 'KeyY', direction: 'd' },
];

let centerCommand: string | null = null;

/** Set the command sent by Ctrl+I. Pass null to disable. */
export function setCenterCommand(cmd: string | null): void {
  centerCommand = cmd;
}

let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

export function setupKeyboardBindings(api: PluginApi): void {
  keydownHandler = (e: KeyboardEvent) => {
    const active = document.activeElement as HTMLElement | null;
    const modalOpen = document.querySelector('.modal.show');
    if (modalOpen && (!active || active.id !== 'message-input')) return;
    if (active && active.id !== 'message-input' && (active.matches('input, textarea') || active.isContentEditable))
      return;

    if (!e.ctrlKey || e.altKey || e.shiftKey) return;

    if (e.code === 'KeyI') {
      if (centerCommand) {
        e.preventDefault();
        api.command.send(centerCommand);
      }
      return;
    }

    if (e.code === 'Digit0') {
      e.preventDefault();
      const room = api.map.getRoom();
      const first = Object.keys(room?.specialExits ?? {})[0];
      if (first) api.command.send(first);
      return;
    }

    const binding = DIRECTION_BINDINGS.find((b) => b.code === e.code);
    if (binding) {
      e.preventDefault();
      api.command.send(binding.direction);
    }
  };

  window.addEventListener('keydown', keydownHandler);
}

export function teardownKeyboardBindings(): void {
  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }
}
