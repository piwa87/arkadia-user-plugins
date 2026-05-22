# Game Systems Reference

Reference for `api.containers`, `api.herbs`, `api.prettyContainers`, `api.magics`, `api.magicKeys`, `api.settings`, `api.locationNotes`, `api.people`, `api.buttonMacros`, and `api.triggerMacros`.

---

## Containers API — `api.containers`

Put and take items from the four assigned bag types. Handles open/put/close or open/take/close sequences automatically.

```typescript
type ContainerType = "money" | "gems" | "food" | "other";

api.containers.getContainer(type: ContainerType): string       // bag name, e.g. "plecak"
api.containers.getContainerForms(type: ContainerType): ContainerForms | null
// { mianownik, dopelniacz, biernik }

api.containers.put(type: ContainerType, item: string): void   // put item(s) into bag
api.containers.take(type: ContainerType, item: string): void  // take item(s) from bag
```

### Examples

```typescript
// Put collected money into money bag
api.containers.put("money", "monety");

// Take sword from general bag
api.containers.take("other", "miecz");

// Multiple items (comma-separated, game processes them)
api.containers.put("other", "miecz, tarcza");

// Get bag name for display
const bagName = api.containers.getContainer("other");
api.output.print(`Torba: ${bagName}`);
```

---

## Herbs API — `api.herbs`

```typescript
// Get current herb inventory across all bags
api.herbs.getBags(): HerbBagsState
// HerbBagsState = Record<number, { herbs: Record<string, number>; condition?: number }>

// Take herbs (returns actual number taken)
await api.herbs.take(herbId: string, amount: number, fromBag?: number): Promise<number>

// Put herbs into a bag (returns actual number put)
await api.herbs.put(herbId: string, amount: number, bag: number): Promise<number>

// Move herbs between bags
await api.herbs.move({ herbId, amount, fromBag, toBag }): Promise<void>

// Get herb database (grammatical forms + uses)
await api.herbs.getData(): Promise<HerbsData | null>
```

### Examples

```typescript
// Count total of a specific herb across all bags
const bags = api.herbs.getBags();
let total = 0;
for (const bag of Object.values(bags)) {
  total += bag.herbs["ziolo_many"] ?? 0;
}
api.output.print(`Ziolo many: ${total}`);

// Take 3 herbs from whichever bag has them
const taken = await api.herbs.take("ziolo_many", 3);
api.output.print(`Wzięto: ${taken}`);

// Get herb display name
const data = await api.herbs.getData();
if (data) {
  const forms = data.herb_id_to_odmiana["ziolo_many"];
  api.output.print(`Zioło: ${forms.mianownik}`);
}
```

---

## Pretty Containers API — `api.prettyContainers`

Extend the container item display with custom categories and color transforms.

```typescript
api.prettyContainers.getFilters(): ReadonlyArray<GroupDefinition>
api.prettyContainers.getTransforms(): ReadonlyArray<TransformDefinition>
api.prettyContainers.addFilter(definition: GroupDefinition): void
api.prettyContainers.addTransform(definition: TransformDefinition): void
```

```typescript
interface GroupDefinition {
  name: string;
  filter: (item: string) => boolean;
}

interface TransformDefinition {
  transform: (
    buffer: AnsiAwareBuffer,
    item: { name: string; count: string | number },
    group: string
  ) => AnsiAwareBuffer;
}
```

### Example

```typescript
// Add a "potions" group
api.prettyContainers.addFilter({
  name: "mikstury",
  filter: (item) => /eliksir|mikstura/i.test(item),
});

// Highlight potions in green
api.prettyContainers.addTransform({
  transform: (buffer, item, group) => {
    if (group === "mikstury") {
      buffer.color([0, buffer.length], api.colors.fromHex('#00ff88'));
    }
    return buffer;
  }
});
```

---

## Magics API — `api.magics`

Access the magic item pattern database.

```typescript
await api.magics.getPatterns(): Promise<string[]>         // regex pattern strings
await api.magics.getRawData(): Promise<MagicsFile | undefined>
// MagicsFile = { magics: Record<string, { type: string[]; regexps?: string[] }> }
```

### Example

```typescript
const patterns = await api.magics.getPatterns();
const isMagic = (item: string) => patterns.some(p => new RegExp(p, 'i').test(item));
```

---

## Magic Keys API — `api.magicKeys`

```typescript
await api.magicKeys.getPatterns(): Promise<string[]>
await api.magicKeys.getRawData(): Promise<{ magic_keys: string[] } | undefined>
```

---

## Settings API — `api.settings`

Read-only access to character settings and UI settings.

```typescript
await api.settings.getCharacterSettings(): Promise<Settings>
await api.settings.getCharacterSetting(key: keyof Settings): Promise<Settings[K]>
await api.settings.getUiSettings(): Promise<UiSettings>
await api.settings.getUiSetting(key: keyof UiSettings): Promise<UiSettings[K]>
```

### Common character settings keys

- `attackCommand` — e.g. `"zabij"`, `"zaatakuj"`
- `supportCommand` — e.g. `"wesprzyj"`
- `drawWeaponCommand`
- `guilds` — `string[]`
- `collectMode` — loot/collect mode

---

## Location Notes API — `api.locationNotes`

Add plugin-contributed notes to map locations (appear alongside user notes).

```typescript
api.locationNotes.set(roomId: number, note: string): void   // empty string removes note
api.locationNotes.remove(roomId: number): void
api.locationNotes.get(roomId: number): PluginLocationNote[]
// PluginLocationNote = { pluginId, note }
```

### Example

```typescript
// Mark current room when an NPC is spotted
api.triggers.register(/Kupiec jest tutaj/, (line) => {
  const room = api.map.getRoom();
  if (room) api.locationNotes.set(room.id, "Kupiec NPC");
  return line;
}, TAG);

// Clean up notes on destroy
export async function destroy() {
  // remove all notes this plugin set (track roomIds manually or use an event)
  api.locationNotes.remove(lastRoomId);
}
```

---

## People API — `api.people`

Manage the people database (social list with guild, description, enemy/ally status).

```typescript
api.people.add({ name, description, guild }): void
api.people.edit(targetKey: string, { name, description, guild }): void
api.people.remove(eventId: string): void
api.people.ignore(targetKey: string): void
api.people.restore(targetKey: string): void
api.people.markEnemy(targetKey: string): void
api.people.unmarkEnemy(targetKey: string): void
api.people.markAlly(targetKey: string): void
api.people.unmarkAlly(targetKey: string): void
api.people.setColor(targetKey: string, color: string): void
api.people.clearColor(targetKey: string): void
api.people.find(name: string, description: string): PersonListEntry | undefined
api.people.findByKey(key: string): PersonListEntry | undefined
api.people.getAll(): PersonListEntry[]
api.people.makeKey(name: string, description: string): string
```

---

## Button Macros API — `api.buttonMacros`

Register custom macros assignable to mobile/desktop buttons.

```typescript
const handle = api.buttonMacros.register({
  id: string,           // unique ID within plugin (prefixed with "plugin:" internally)
  label: string,        // shown in button config UI
  onClick: (context: ButtonMacroClickContext) => void,
  configFields?: MacroConfigField[],
  states?: MacroState[],       // for stateful (toggle/mode) macros
  initialState?: string,
}): ButtonMacroHandle

api.buttonMacros.unregister(id: string): void
api.buttonMacros.getState(id: string): string | undefined
api.buttonMacros.setState(id: string, stateId: string): boolean
api.buttonMacros.onStateChange(id, listener): () => void  // returns unsubscribe fn
```

### Simple macro example

```typescript
api.buttonMacros.register({
  id: "heal",
  label: "Heal",
  onClick: (ctx) => {
    ctx.client.sendCommand("pij miksture");
  }
});
```

### Stateful toggle macro example

```typescript
const macro = api.buttonMacros.register({
  id: "autoHeal",
  label: "Auto Heal",
  states: [
    { id: "off", label: "OFF", color: "#666666" },
    { id: "on",  label: "ON",  color: "#00ff00" },
  ],
  initialState: "off",
  onClick: (ctx) => {
    ctx.stateCtx.cycleState();
  }
});

// Read state
if (macro.getState() === "on") { /* active */ }
```

---

## Trigger Macros API — `api.triggerMacros`

Register custom macros that users can attach to their trigger rules.

```typescript
api.triggerMacros.register({
  id: string,
  label: string,
  onMatch: (context: TriggerMacroContext) => void,
  configFields?: MacroConfigField[],
}): void

api.triggerMacros.unregister(id: string): void
```

```typescript
interface TriggerMacroContext {
  line: AnsiAwareBuffer;
  matchRange: [number, number];
  config: Record<string, any>;
}
```

### Example

```typescript
api.triggerMacros.register({
  id: "highlight",
  label: "Highlight Match",
  onMatch: (ctx) => {
    const color = ctx.config.color ?? "#ff0000";
    ctx.line.color(ctx.matchRange, api.colors.fromHex(color));
  },
  configFields: [
    { name: "color", type: "text", label: "Color (hex)", defaultValue: "#ff0000" }
  ]
});
```
