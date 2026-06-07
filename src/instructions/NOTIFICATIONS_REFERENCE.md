# Notifications Reference

There are two separate notification systems in the Arkadia client. They look different and are triggered differently.

---

## 1. In-app toast — `api.events.emit("notify", ...)`

Available in plugins. Shows a small overlay div in the top-left corner of the game window.

```typescript
api.events.emit('notify', { text: 'Wszystko padlo', time: 3000 });
```

| Property | Type | Default | Notes |
|---|---|---|---|
| `text` | `string` | — | Message to display |
| `time` | `number` (ms) | `2000` | How long before it fades |

**How it works internally:**

`api.events.emit('notify', ...)` → `client.sendEvent('notify', ...)` → `main.ts` handler → `div.notification` appended to `#notification-center`

**Styling:** dark semi-transparent background (`rgba(0,0,0,0.6)`), white text, `z-index: 1104`, `border-radius: 0.5rem`. Positioned `top: 3rem; left: 0.5rem` (or `top: 0.5rem` when Layout Manager is enabled).

---

## 2. OS browser notification — `src/lib/notifications.ts`

Available in plugins via a utility from `src/lib/notifications.ts`. Shows a system popup outside the browser tab (standard browser Notification API). Requires the user to grant permission once.

```typescript
import { requestPermission, notify } from '../lib/notifications';

export async function init(api: PluginApi): Promise<PluginInfo> {
    // Request permission once on load (no-op if already granted/denied)
    requestPermission();

    api.triggers.register(/pelne zycie/, () => {
        notify('Masz pelne zycie!');
        return null;
    }, tag);

    return { name: 'My Plugin', version: '1.0.0' };
}
```

| Function | Behaviour |
|---|---|
| `requestPermission()` | Calls `Notification.requestPermission()`. No-op if permission already decided. |
| `notify(message)` | Shows a browser notification. Silent no-op if permission not granted. |

**Permission flow:** Call `requestPermission()` in `init()`. The browser will show a one-time permission prompt. After the user grants it, `notify()` works for the lifetime of the session and all future sessions.

---

## Summary

| | In-app toast | OS browser notification |
|---|---|---|
| Available in plugins | yes | yes (`src/lib/notifications.ts`) |
| How to trigger | `api.events.emit('notify', { text, time? })` | `notify(message)` from `src/lib/notifications` |
| Where it appears | top-left overlay in game window | system popup outside browser |
| Requires permission | no | yes — call `requestPermission()` in `init()` |
| Default duration | 2000ms | until dismissed |
