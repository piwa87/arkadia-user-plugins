# Map & GMCP API Reference

Reference for what's available to plugins via `api.map` and `api.gmcp` in the Arkadia web client plugin API.

---

## Map API — `api.map`

### Methods

```typescript
api.map.getRoom(): MapData.Room | undefined
```
Returns the current room the player is in. `undefined` if the map hasn't loaded yet.

```typescript
api.map.getRoomById(roomId: number): MapData.Room | null
```
Fetch any room by its numeric ID.

```typescript
api.map.getAreas(): AreaInfo[]
```
Returns all map areas, each containing `{ areaId, areaName, rooms: MapData.Room[] }`.

```typescript
api.map.findPath(fromId: number, toId: number): number[] | null
```
A* pathfinding. Returns an ordered array of room IDs from `fromId` to `toId`, or `null` if no path found.

```typescript
api.map.setLocation(roomId: number): void
```
Manually move the map cursor to a specific room (does not move the player).

```typescript
api.map.stepBack(): void
```
Move the map cursor back to the previous room in location history.

```typescript
api.map.createHighlighter(options?: LocationHighlighterOptions): LocationHighlighter
```
Create a room highlight overlay on the map. Multiple independent highlighters are supported.

---

### Room Data — `MapData.Room`

```typescript
interface Room {
  id: number;
  area: number;
  x: number; y: number; z: number;   // 3D coordinates
  name: string;
  env: number;                        // environment/terrain type
  weight: number;                     // pathfinding weight
  roomChar: string;                   // visual symbol on map
  exits: Record<direction, number>;   // direction → roomId
  doors: Record<direction, 1 | 2 | 3>;
  specialExits: Record<string, number>;
  stubs: number[];
  userData: Record<string, string>;
  exitWeights?: Record<string, number>;
  exitLocks?: number[];
  hash: string;
}

type direction =
  | "north" | "south" | "east" | "west"
  | "northwest" | "northeast" | "southeast" | "southwest"
  | "up" | "down" | "in" | "out"
```

---

### Highlighter — `LocationHighlighter`

```typescript
highlighter.add(roomIds: number | number[]): void
highlighter.remove(roomIds: number | number[]): void
highlighter.clear(): void
highlighter.enable(): void
highlighter.disable(): void
highlighter.isEnabled(): boolean
highlighter.setColor(color: string): void  // any CSS color
highlighter.getColor(): string
highlighter.getRoomIds(): number[]
highlighter.destroy(): void               // cleanup when done
```

**Options:**
```typescript
interface LocationHighlighterOptions {
  color?: string;    // CSS color, default: "yellow"
  enabled?: boolean; // default: true
}
```

---

### Map Events

```typescript
api.events.on("mapMove", () => { const room = api.map.getRoom(); ... })
api.events.on("gmcp.room.info", (info: GmcpRoomInfo) => { ... })
```

---

## GMCP API — `api.gmcp`

### Direct Access

```typescript
api.gmcp.get(): Record<string, any>
```

Returns the full live GMCP state object. Access nested data with optional chaining:

```typescript
const g = api.gmcp.get();
g.char?.info?.name
g.char?.state?.hp
g.room?.info?.map?.name
g.room?.time?.season
```

---

### GMCP Events

Subscribe via `api.events.on(eventName, listener)`:

| Event | Payload type | Description |
|---|---|---|
| `gmcp.char.info` | `GmcpCharInfo` | Character identity |
| `gmcp.char.state` | `GmcpCharState` | Vitals (hp, mana, fatigue, …) |
| `gmcp.char.options` | `GmcpCharOptions` | Character settings (30+ fields) |
| `gmcp.char.options.info` | `GmcpCharOptionsInfo` | Available values per option |
| `gmcp.char.colors` | `GmcpCharColors` | Color config |
| `gmcp.room.info` | `GmcpRoomInfo` | Room location, exits, hash |
| `gmcp.room.time` | `GmcpRoomTime` | Daylight, season |
| `gmcp.objects.data` | `Map<number, ObjectData>` | NPCs/objects in room |
| `gmcp.objects.nums` | `number[][]` | IDs of objects in room |
| `gmcp.core.ping` | `void` | Server ping |
| `gmcp` | `{ path: string; value: unknown }` | Any GMCP update |

---

### Key GMCP Types

#### `GmcpCharState`
```typescript
interface GmcpCharState {
  hp?: number;
  mana?: number;
  fatigue?: number;
  improve?: number;
  form?: number;
  intox?: number;
  headache?: number;
  stuffed?: number;
  soaked?: number;
  encumbrance?: number;
  panic?: number;
  state?: string;
}
```

#### `GmcpRoomInfo`
```typescript
interface GmcpRoomInfo {
  map?: {
    domain?: string;  // "Empire" | "Ishtar"
    x?: number;
    y?: number;
    z?: number;
    id?: string;
    name?: string;
  };
  exits?: string[];
  num?: number;
  id?: number;
  hash?: string;
}
```

#### `ObjectData` (from `gmcp.objects.data`)
```typescript
interface ObjectData {
  desc?: string;
  hp?: number;
  attack_num?: boolean | number;
  attack_target?: boolean;
  defense_target?: boolean;
  avatar_target?: boolean;
  state?: any;
  [key: string]: any;
}
```

---

### GMCP Message Events — `gmcp_msg.*`

These carry `AnsiAwareBuffer` content (formatted game text):

```typescript
api.events.on("gmcp_msg.room.long", (buf) => { ... })   // full room desc
api.events.on("gmcp_msg.room.short", (buf) => { ... })  // short room desc
api.events.on("gmcp_msg.room.exits", (buf) => { ... })  // exits line
api.events.on("gmcp_msg.combat.avatar", (buf) => { ... })
api.events.on("gmcp_msg.combat.team", (buf) => { ... })
api.events.on("gmcp_msg.comm", (buf) => { ... })
api.events.on("gmcp_msg.emotes", (buf) => { ... })
api.events.on("gmcp_msg.notification.common", (buf) => { ... })
api.events.on("gmcp_msg.system", (buf) => { ... })
api.events.on("gmcp_msg.prompt", (buf) => { ... })
// ... and more: room.item, room.contents.living, room.contents.object,
//     living.long, object.long, mail, notification.mail/knowledge/relations/boards
```

---

## Source Files

These paths are in the upstream **Arkadia Web Client** repository (not in this plugin repo) — for reference if you have access to the client source:

| File | What's there |
|---|---|
| `src/client/PluginApi.ts` | `MapApi` (~line 454), `GmcpApi` (~line 1038), `LocationHighlighter` (~line 356) |
| `src/client/types/MapData.d.ts` | `Room` type, `direction` type |
| `src/shared/events/gmcpTypes.ts` | All GMCP data type interfaces, `GmcpMsgType` enum |
| `src/shared/events/clientEvents.ts` | Full event name list (~line 416) |
