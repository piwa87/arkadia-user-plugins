# Aliases & Commands Reference

Reference for `api.aliases`, `api.command`, and `api.commandHooks`.

---

## Aliases API — `api.aliases`

Intercept user input before it's sent to the game. The regex is matched against the raw command line.

```typescript
// Register — returns an ID for later removal
const id = api.aliases.register(pattern: RegExp, callback: (matches?: RegExpMatchArray) => boolean): string

// Remove a specific alias
api.aliases.remove(id: string): void
```

**Callback return value:**
- `true` — command handled; do **not** send to game
- `false` — pass command through to game (after alias processing)

**Pattern tips:**
- Always anchor: `/^pattern$/i` to avoid partial matches
- Use `i` flag for case-insensitive matching
- Capture groups go into `matches[1]`, `matches[2]`, etc.
- Never include Polish letters in regex patterns

---

### Examples

```typescript
// Simple command with no arguments
api.aliases.register(/^wr$/i, () => {
  api.command.send("wróć");
  return true;
});

// Command with required argument
api.aliases.register(/^idz\s+(.+)$/i, (matches) => {
  if (!matches?.[1]) {
    api.output.print("Usage: idz <kierunek>");
    return true;
  }
  api.command.send(`idz ${matches[1]}`);
  return true;
});

// Command with optional argument
api.aliases.register(/^loot(?:\s+(.+))?$/i, (matches) => {
  const target = matches?.[1] ?? "wszystko";
  api.command.send(`podniés ${target}`);
  return true;
});
```

---

## Command API — `api.command`

```typescript
// Send a command to the server
api.command.send(command: string, echo?: boolean, options?: any): Promise<void>
// echo defaults to true (shows command in output)
// use echo=false to send silently

// Add words to tab-completion
api.command.addSuggestions(...words: string[]): void

// Remove previously added words from tab-completion
api.command.removeSuggestions(...words: string[]): void
```

### Examples

```typescript
// Send a command (shows in output)
await api.command.send("look");

// Send silently (not echoed)
await api.command.send("atakuj ob_12345", false);

// Send a sequence
await api.command.send("otworz drzwi");
await api.command.send("wejdz");

// Add tab-completion words
api.command.addSuggestions("goblin", "smok", "rycerz");
```

---

## Command Hooks API — `api.commandHooks`

Intercept commands **before** any processing (before alias matching, Polish stripping, map parsing, etc.).

```typescript
type CommandHookCallback = (
  command: string,
  echo?: boolean,
  options?: any
) => string | null | undefined;
// Return:
//   string  — replace command with this
//   null    — suppress/cancel the command
//   undefined — keep original command unchanged

// Register — returns hookId for removal
const hookId = api.commandHooks.register(callback: CommandHookCallback, priority?: number): string
// Higher priority = runs first (default: 0)

// Remove hook
api.commandHooks.unregister(hookId: string): boolean
```

### Examples

```typescript
// Rewrite a command
const hookId = api.commandHooks.register((cmd) => {
  if (cmd === "atakuj") return "atakuj ob_12345";
  return undefined;
});

// Block a dangerous command
api.commandHooks.register((cmd) => {
  if (cmd.startsWith("usun wszystko")) {
    api.output.print("Zablokowano niebezpieczne polecenie!");
    return null;
  }
  return undefined;
});

// Cleanup in destroy()
export async function destroy() {
  api.commandHooks.unregister(hookId);
}
```

---

## Cleanup Pattern

Always store IDs and clean up in `destroy()`:

```typescript
const TAG = "myPlugin";
let aliasId: string;
let hookId: string;

export async function init(api) {
  aliasId = api.aliases.register(/^cmd$/i, () => { return true; });
  hookId = api.commandHooks.register((cmd) => undefined);
  // triggers use tag-based cleanup — no need to store individually
  api.triggers.register(/pattern/, callback, TAG);
  // ...
  return { name: "My Plugin", version: "1.0.0" };
}

export async function destroy() {
  api.aliases.remove(aliasId);
  api.commandHooks.unregister(hookId);
  api.triggers.removeByTag(TAG);
  api.command.removeSuggestions("goblin", "smok");
}
```
