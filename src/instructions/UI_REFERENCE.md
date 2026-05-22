# UI Reference

Reference for `api.ui`, `api.bind`, and `api.output`.

---

## Footer Components — `api.ui.registerFooterComponent`

Add a widget to the status bar (next to the clock, attack mode, etc.).

```typescript
const handle = api.ui.registerFooterComponent(
  id: string,                           // unique ID (namespaced internally by plugin)
  content: string | Node | ReactElement, // HTML string, DOM node, or React element
  position?: 'start' | 'end' | number   // insertion position (default: 'end')
): FooterComponentHandle
```

### FooterComponentHandle

```typescript
handle.element: HTMLSpanElement         // direct DOM access
handle.setContent(content: string | Node | ReactElement): void
handle.setVisible(visible: boolean): void
handle.remove(): void
```

### Examples

```typescript
// Simple HTML string
const timer = api.ui.registerFooterComponent('timer', '<span style="color:yellow">0s</span>');
let t = 0;
const interval = setInterval(() => {
  timer.setContent(`<span style="color:yellow">${++t}s</span>`);
}, 1000);

// DOM node
const span = document.createElement('span');
span.style.color = 'springgreen';
span.textContent = 'Ready';
const status = api.ui.registerFooterComponent('status', span);
status.element.textContent = 'Busy'; // direct DOM update

// React component (with state/hooks)
import { useState, useEffect } from 'react';
const Counter: React.FC = () => {
  const [n, setN] = useState(0);
  useEffect(() => { const id = setInterval(() => setN(x => x+1), 1000); return () => clearInterval(id); }, []);
  return <span style={{ color: 'yellow' }}>{n}s</span>;
};
api.ui.registerFooterComponent('counter', <Counter />);
```

---

## Persistent Popups — `api.ui.registerPersistentPopup`

Preferred for popups that should survive page reloads (docked/pinned state is restored).

```typescript
const handle = await api.ui.registerPersistentPopup({
  id: string,                                     // stable ID (no need to be globally unique)
  title: string,
  createContent: () => PopupContent | Promise<PopupContent>, // called on open/restore
  headerActions?: Node | React.ReactNode,         // buttons in popup header
  pinned?: boolean,                               // initial pinned state (default: false)
}): Promise<PersistentPopupHandle>
```

### PersistentPopupHandle

```typescript
handle.id: string               // namespaced popup ID
handle.wasRestored: boolean     // true if restored from previous session
handle.isOpen: boolean
handle.isPinned: boolean
handle.open(): Promise<void>    // opens popup (calls createContent())
handle.close(): void
handle.setTitle(title: string): void
handle.setBody(content: PopupContent): void
handle.setPinned(pinned: boolean): void
handle.setHeaderActions(actions: Node | React.ReactNode): void
handle.onClose(callback: () => void): void
```

### Example

```typescript
const popup = await api.ui.registerPersistentPopup({
  id: 'inventory',
  title: 'Ekwipunek',
  createContent: () => {
    const div = document.createElement('div');
    div.textContent = 'Brak przedmiotów';
    return div;
  }
});

// Toggle via popup menu
api.ui.addPopupMenuEntry('Ekwipunek', () => {
  popup.isOpen ? popup.close() : popup.open();
});
```

---

## Popup Menu Entry — `api.ui.addPopupMenuEntry`

Adds an entry to the ⋮ menu in the client header.

```typescript
const entry = api.ui.addPopupMenuEntry(
  label: string | Node,
  onSelect: () => void
): PopupMenuEntryHandle

entry.setLabel(label: string | Node): void
entry.setDisabled(disabled: boolean): void
entry.remove(): void
```

---

## Context Menu Entry — `api.ui.addContextMenuEntry`

Adds an entry to the right-click context menu on game output.

```typescript
const entry = api.ui.addContextMenuEntry(
  label: string | Node,
  action: () => void
): ContextMenuEntryHandle

entry.setLabel(label: string | Node): void
entry.setAction(action: () => void): void
entry.remove(): void
```

---

## Simple Popup (deprecated) — `api.ui.createPopup`

For quick one-off popups that don't need persistence. Prefer `registerPersistentPopup` for anything that needs to survive reloads.

```typescript
const handle = await api.ui.createPopup(title: string, body: PopupContent): Promise<PopupHandle>

handle.element: HTMLDivElement
handle.isPinned: boolean
handle.setTitle(title: string): void
handle.setBody(content: PopupContent): void
handle.setPinned(pinned: boolean): void
handle.onClose(callback: () => void): void
handle.close(): void
```

---

## PopupContent types

```typescript
type PopupContent = string | Node | React.ReactNode
// string → rendered as innerHTML (HTML)
// Node   → DOM node appended directly
// React.ReactNode → React element rendered inside popup
```

---

## Functional Bind API — `api.bind`

Bind a command or callback to the configured function key (default: `CTRL+]`).

```typescript
api.bind.set(
  printable: string | null,  // command to send (or null for callback-only)
  callback?: () => void,     // optional callback instead of sending command
  clearAfterUse?: boolean    // auto-clear after first use
): void

api.bind.clear(): void

api.bind.getLabel(): string  // returns key label, e.g. "CTRL+]"
```

### Examples

```typescript
// Bind a command
api.bind.set("atakuj goblina");

// Bind a callback
api.bind.set(null, () => {
  api.output.print("Akcja!");
});

// Bind with auto-clear (one-shot)
api.bind.set("pij miksture", undefined, true);

// Show what key is bound
api.output.print(`Klawisz: ${api.bind.getLabel()}`);

// Clear bind
api.bind.clear();

// Fire the bind programmatically
api.events.emit("executeFunctionalBind");
```

---

## Output — `api.output`

```typescript
api.output.print(text: string | AnsiAwareBuffer): void
```

For plain text, just pass a string. For colored/formatted output use `AnsiAwareBuffer` (see `TRIGGERS_REFERENCE.md`).
