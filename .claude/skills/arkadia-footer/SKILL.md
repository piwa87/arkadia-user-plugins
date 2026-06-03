---
name: arkadia-footer
description: 'Reference for adding footer/status-bar components to Arkadia MUD client plugins using api.ui.registerFooterComponent. Use when implementing a plugin footer widget, status indicator, timer, or any UI element in the client status bar.'
argument-hint: 'describe the footer component you want to build'
---

# Arkadia Plugin Footer Components

## Overview

Plugins add custom UI to the footer bar (status bar at the bottom of the client) via `api.ui.registerFooterComponent`. Components appear inside `<span id="plugin-footer-components"></span>`, alongside built-in indicators like attack mode, clock, and timers.

## Registration API

```typescript
const handle = api.ui.registerFooterComponent(
  id: string,                              // unique ID (auto-namespaced with plugin name)
  content: string | Node | ReactElement,  // what to display
  position?: 'start' | 'end' | number     // placement (default: 'end')
);
```

## Content Types

### HTML string
```typescript
const handle = api.ui.registerFooterComponent(
  'myTimer',
  '<span style="color: yellow;">Timer: 0</span>'
);
```

### DOM Node
```typescript
const el = document.createElement('span');
el.textContent = 'Ready';
el.style.color = 'springgreen';
const handle = api.ui.registerFooterComponent('status', el);
```

### React Component (preferred for dynamic content)
```typescript
import { useState, useEffect } from 'react';

const MyWidget: React.FC = () => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setValue(v => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ color: 'yellow' }}>Value: {value}</span>;
};

const handle = api.ui.registerFooterComponent('widget', <MyWidget />);
```

## Handle Methods

```typescript
interface FooterComponentHandle {
  readonly element: HTMLSpanElement;
  setContent(newContent: string | Node | ReactElement): void;
  setVisible(visible: boolean): void;
  remove(): void;
}
```

## Complete Plugin Example

```typescript
import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { useState, useEffect } from 'react';

export async function init(api: PluginApi): Promise<PluginInfo> {
  const Timer: React.FC = () => {
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
      const id = setInterval(() => setSeconds(s => s + 1), 1000);
      return () => clearInterval(id);
    }, []);
    return (
      <span style={{ color: '#ffd700', marginRight: '0.5rem' }}>
        ⏱ {seconds}s
      </span>
    );
  };

  api.ui.registerFooterComponent('timer', <Timer />);

  return { name: 'Timer Plugin', version: '1.0.0' };
}
```

## Notes

- IDs are auto-namespaced by plugin name — no need to prefix
- Components are automatically removed on plugin unload
- HTML string content uses `innerHTML` — avoid user input to prevent XSS
- React hooks (useState, useEffect, etc.) fully supported

## Source References (Arkadia client repo)

- Registry: `src/modules/core/pluginFooterRegistry.ts`
- Plugin API: `src/client/PluginApi.ts` lines ~826–913
- HTML container: `index.html` line 99
