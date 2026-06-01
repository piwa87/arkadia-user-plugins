# Functional Bind Alias Guide

This guide shows how to create aliases that set and fire functional binds without modifying the source code.

## Overview

Functional binds in Arkadia allow you to bind a command or callback to a key (typically `CTRL+]`). This guide demonstrates how to manage binds through simple command aliases:

- `f+<command>` — Set the functional bind
- `f` — Fire the currently set functional bind
- `f-` — Clear the bind (optional)

---

## Example 1: Basic Set Functional Bind with `f+<command>`

Set a functional bind with any command or command sequence.

```typescript
export async function init(api: PluginApi): Promise<PluginInfo> {
  // Set functional bind: f+ attack goblin
  // or: f+ get sword, equip sword, wield sword
  api.aliases.register(/^f\+\s+(.+)$/i, (matches) => {
    if (!matches?.[1]) {
      api.output.print("Usage: f+ <command>");
      return true;
    }

    const command = matches[1].trim();
    api.bind.set(command);
    api.output.print(`Bind set to: ${command}`, "system");
    return true;
  });

  return { name: "Functional Bind Manager", version: "1.0.0" };
}
```

### Usage

```
f+ attack goblin          → Sets bind to single command
f+ get sword, wield sword → Sets bind to multiple commands (game will process them)
f+ drink potion           → Sets bind to a single game command
```

### How It Works

- Regex `/^f\+\s+(.+)$/i` matches `f+` followed by any text
- `matches[1]` captures everything after `f+`
- `api.bind.set(command)` sets the functional bind with the captured command
- Visual feedback is printed to the output

---

## Example 2: Basic Fire Functional Bind with `f`

Fire the currently set functional bind by typing just `f` and pressing Enter.

```typescript
export async function init(api: PluginApi): Promise<PluginInfo> {
  // Fire the currently set functional bind
  api.aliases.register(/^f$/i, () => {
    api.events.emit('executeFunctionalBind');
    return true;
  });

  return { name: "Functional Bind Manager", version: "1.0.0" };
}
```

### Usage

```
f+ attack goblin  → Sets the bind
f                 → Fires the bind (executes "attack goblin")
f                 → Fires again (same command)
```

### How It Works

- Regex `/^f$/i` matches exactly `f` (case-insensitive)
- `api.events.emit('executeFunctionalBind')` triggers the highest-priority active bind
- This uses the same event that keyboard presses use internally

---

## Example 3: Combined with Enhanced Features

Full implementation with visual feedback, bind label display, and optional clear command.

```typescript
export async function init(api: PluginApi): Promise<PluginInfo> {
  // ============================================================================
  // Set functional bind with visual feedback
  // ============================================================================
  api.aliases.register(/^f\+\s+(.+)$/i, (matches) => {
    if (!matches?.[1]) {
      api.output.print("Usage: f+ <command>");
      return true;
    }

    const command = matches[1].trim();
    api.bind.set(command);
    
    // Visual feedback showing what key to press and what command is bound
    const bindLabel = api.bind.getLabel();
    api.output.print(
      `[Bind] ${bindLabel} → ${command}`,
      "system"
    );
    return true;
  });

  // ============================================================================
  // Fire the bind
  // ============================================================================
  api.aliases.register(/^f$/i, () => {
    api.events.emit('executeFunctionalBind');
    return true;
  });

  // ============================================================================
  // Clear bind (optional bonus feature)
  // ============================================================================
  api.aliases.register(/^f-$/i, () => {
    api.bind.clear();
    api.output.print("Bind cleared", "system");
    return true;
  });

  return { name: "Functional Bind Manager", version: "1.0.0" };
}
```

### Usage Examples

```
f+ attack goblin        → Sets bind, shows: "[Bind] CTRL+] → attack goblin"
f                       → Fires the bind (executes "attack goblin")
f+ get sword, wield     → Updates bind to new command
f                       → Fires again (executes new command)
f-                      → Clears the bind
f                       → Does nothing (no bind set)
```

### Key Features

- **`f+ <command>`** — Sets bind and displays what physical key is configured
- **`f`** — Fires the bind
- **`f-`** — Clears the bind (helpful for cleanup)
- **Bind label** — Shows the actual key combination (e.g., "CTRL+]", "ALT+SHIFT+K")
- **Visual feedback** — Output clearly shows what was bound

---

## Implementation Notes

### Multi-Command Sequences

The game handles comma-separated commands natively, so you can set binds with multiple actions:

```
f+ open bag, get sword, close bag
f+ drink potion, wield sword
f+ get coin, put coin in bag
```

### Return Value

Returning `true` from the alias callback prevents the command from being sent to the game. This is important because we're handling the command in the alias itself.

```typescript
api.aliases.register(/^f\+\s+(.+)$/i, (matches) => {
  // ... process the bind ...
  return true;  // Don't send "f+ ..." to the game
});
```

### Bind Label

Use `api.bind.getLabel()` to show users what physical key is configured for the bind:

```typescript
const bindLabel = api.bind.getLabel();
// Returns something like "CTRL+]", "ALT+SHIFT+K", or "]" depending on settings
```

### Error Handling

The basic examples include a usage hint if the command is empty:

```typescript
if (!matches?.[1]) {
  api.output.print("Usage: f+ <command>");
  return true;
}
```

### Case-Insensitive Matching

All regex patterns use the `i` flag for case-insensitive matching:

```typescript
/^f\+\s+(.+)$/i  // Matches F+ ATTACK as well as f+ attack
/^f$/i            // Matches F as well as f
/^f-$/i           // Matches F- as well as f-
```

---

## Advanced: Adding Custom Feedback

You can enhance the set command with more detailed feedback:

```typescript
api.aliases.register(/^f\+\s+(.+)$/i, (matches) => {
  if (!matches?.[1]) {
    api.output.print("Usage: f+ <command>");
    return true;
  }

  const command = matches[1].trim();
  api.bind.set(command);
  
  const bindLabel = api.bind.getLabel();
  const buffer = new api.AnsiAwareBuffer();
  buffer.append("[Bind] ", api.colors.fromHex('#00ffaf'));
  buffer.append(bindLabel, api.colors.fromHex('#ffd787'));
  buffer.append(" → ", api.colors.fromHex('#00ffaf'));
  buffer.append(command, api.colors.fromHex('#ffffff'));
  
  api.output.print(buffer);
  return true;
});
```

This uses the same color scheme as the built-in functional bind display for visual consistency.

---

## How Functional Binds Work Internally

Understanding the internals helps you use binds effectively:

1. **FunctionalBindManager** — Manages multiple bind slots organized by category (default, gates, transport, loot)
2. **Priority System** — When multiple categories have active binds, the most recently set one takes priority
3. **Event-Based Execution** — Emitting `executeFunctionalBind` executes the highest-priority active bind
4. **Keyboard Integration** — Physical key presses also go through the same priority system

By using the event-based approach, your aliases work seamlessly with the existing bind system.

---

## Choosing Your Implementation

- **Example 1 & 2** — Simple, minimal implementation. Good for quick setup.
- **Example 3** — Recommended. Includes helpful visual feedback and optional clear command.

Pick whichever version fits your workflow best!
