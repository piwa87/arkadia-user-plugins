# Combat & Objects Reference

Reference for `api.attackQueue`, `api.attackController`, `api.combat`, `api.objects`, `api.objectListFilters`, and `api.team`.

---

## Team API — `api.team`

```typescript
api.team.getMembers(): string[]          // array of team member names
api.team.getLeader(): string | undefined // leader's name
api.team.getLeaderId(): number | undefined // leader's object ID
api.team.getPlayerNum(): number | undefined // player's own object number
```

---

## Objects API — `api.objects`

Get all objects in the current room, including NPCs, players, and items.

```typescript
api.objects.getObjectsOnLocation(): LocationObject[]
```

### LocationObject

```typescript
interface LocationObject {
  num: number;                                         // object ID
  desc?: string;                                       // description/name
  hp?: number;
  attack_num?: boolean | number;                       // combat status
  avatar_target?: boolean;
  attack_target?: boolean;
  defense_target?: boolean;
  shortcut?: string;                                   // "@", "A", "1", etc.
  __category?: 'player' | 'team' | 'rest' | 'rest-noncombat';
}
```

### Examples

```typescript
const objects = api.objects.getObjectsOnLocation();

// Find player's own object
const me = objects.find(o => o.__category === 'player');

// Find all enemies (non-team, non-player entities that can fight)
const enemies = objects.filter(o => o.__category === 'rest');

// Find by shortcut key
const target = objects.find(o => o.shortcut === '1');
if (target) api.output.print(`Cel: ${target.desc} (${target.num})`);

// Find weakest enemy
const weakest = enemies.reduce((a, b) => (a.hp ?? 999) < (b.hp ?? 999) ? a : b, enemies[0]);
```

---

## Attack Queue API — `api.attackQueue`

```typescript
api.attackQueue.add(id: number): boolean    // returns false if already queued
api.attackQueue.remove(id: number): boolean // returns false if not found
api.attackQueue.clear(): void
api.attackQueue.get(): number[]             // current queue in order
```

### Example

```typescript
// Add all enemies to queue on room entry
api.events.on("mapMove", () => {
  api.attackQueue.clear();
  const enemies = api.objects.getObjectsOnLocation().filter(o => o.__category === 'rest');
  for (const e of enemies) api.attackQueue.add(e.num);
});
```

---

## Attack Controller API — `api.attackController`

Execute attacks respecting team coordination settings.

```typescript
// Attack a target by object ID
// If attack mode is "AW" or "AWR" and player is leader, also coordinates team
api.attackController.attackById(id: number, command?: string): void

// Support team leader (sends "wesprzyj" + attacks leader's target)
api.attackController.support(command?: string): void

// Read configured commands from character settings
api.attackController.getAttackCommand(): string   // e.g. "zabij", "zaatakuj"
api.attackController.getSupportCommand(): string  // e.g. "wesprzyj"
```

### Example

```typescript
// Attack first enemy in room
const enemies = api.objects.getObjectsOnLocation().filter(o => o.__category === 'rest');
if (enemies[0]) {
  api.attackController.attackById(enemies[0].num);
}

// Support leader
api.attackController.support();
```

---

## Combat API — `api.combat`

```typescript
// Draw all weapons (uses configured draw command from character settings)
api.combat.drawWeapon(): void
```

---

## Object List Filters API — `api.objectListFilters`

Customize how objects appear in the object list panel (colors, icons, prefixes, suffixes).

```typescript
api.objectListFilters.register(
  name: string,
  filter: ObjectListEntryFilter,
  priority?: number   // higher = runs first (default: 0)
): void

api.objectListFilters.unregister(name: string): boolean
api.objectListFilters.getFilterNames(): string[]
api.objectListFilters.clear(): void
```

### ObjectListEntryFilter

```typescript
type ObjectListEntryFilter = (context: EntryContext, result: FilterResult) => void;

interface EntryContext {
  object: ObjectData;           // raw GMCP object data
  rawDescription: string;       // plain text description
  shortcut?: string;            // assigned shortcut key
}

interface FilterResult {
  style: EntryStyle;
  content: EntryContent;
}

interface EntryStyle {
  descriptionColor?: string;    // CSS color for description text
  hpBarColor?: string;          // CSS color for HP bar
  prefix?: string;              // text prepended to entry
  suffix?: string;              // text appended to entry
  backgroundColor?: string;     // entry background
}
```

### Examples

```typescript
// Highlight enemies low on HP
api.objectListFilters.register("lowHp", (context, result) => {
  const { hp, maxhp } = context.object as any;
  if (hp && maxhp && hp / maxhp < 0.2) {
    result.style.hpBarColor = "#ff0000";
    result.style.suffix = (result.style.suffix ?? "") + " ☠";
  }
});

// Color dragons red
api.objectListFilters.register("dragons", (context, result) => {
  if (context.rawDescription.toLowerCase().includes("smok")) {
    result.style.descriptionColor = "#ff4444";
    result.style.prefix = (result.style.prefix ?? "") + "🐉 ";
  }
}, 10);

// Cleanup
export async function destroy() {
  api.objectListFilters.unregister("lowHp");
  api.objectListFilters.unregister("dragons");
}
```
