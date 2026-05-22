# Events Reference

Reference for `api.events` and all available event names.

---

## Events API — `api.events`

```typescript
// Subscribe to an event
api.events.on(event: EventKey, listener: Function, options?: boolean | { once?: boolean; signal?: AbortSignal }): void

// Unsubscribe
api.events.off(event: EventKey, listener: Function): void

// Emit an event
api.events.emit(event: EventKey, ...args): void
```

Always call `api.events.off()` in `destroy()` for any listeners you register.

---

## Game State Events

| Event | Payload | Description |
|---|---|---|
| `mapMove` | `void` | Player moved to a new room |
| `enterLocation` | `{ id, room, direction }` | Entered a location |
| `combatState` | `boolean` | Combat started/ended |
| `combatTimer` | `number \| null` | Combat timer update |
| `teamChange` | `void` | Team composition changed |
| `isTeamLeader` | `boolean` | Player became/stopped being leader |
| `teamLeaderTargetAvatar` | `void` | Leader is targeting own avatar |
| `teamLeaderTargetNoAvatar` | `number` | Leader targeting object ID |
| `attackQueueChange` | `number[]` | Attack queue updated |
| `addToAttackQueue` | `number` | Object added to queue |
| `removeFromAttackQueue` | `number` | Object removed from queue |
| `clearAttackQueue` | `void` | Queue cleared |
| `attackMode` | `"A" \| "AW" \| "AWR"` | Attack mode changed |
| `parsedObjects` | `void` | Object list parsed |
| `parsedNums` | `{ nums: number[] }` | Object IDs updated |
| `kill` | `{ killer: "ME" \| "TEAM" \| "OTHER" }` | Kill registered |
| `enemyKilled` | `{ objNum, killer, hasBody?, enemyDesc? }` | Specific enemy killed |
| `allEnemiesKilled` | `void` | All enemies in room dead |

## Combat / Block Events

| Event | Payload | Description |
|---|---|---|
| `stunStart` | `void` | Player stunned |
| `stunEnd` | `void` | Stun ended |
| `tryingToBlock` | `string` | Attempting to block |
| `hasBlocked` | `string` | Successfully blocked |
| `weapon_state` | `boolean` | Weapon drawn/sheathed |
| `weaponKnockedOff` | `void` | Weapon knocked off |
| `canWieldAfterKnockOff` | `void` | Can wield again after knock-off |
| `maneuverAttempted` | `void` | Maneuver attempted |

## Enemy Status Events

| Event | Payload | Description |
|---|---|---|
| `enemy.paralyzed` | `{ name: string }` | Enemy paralyzed |
| `enemy.paralyzed.end` | `{ name: string }` | Paralysis ended |
| `enemy.broken_defense` | `{ name: string }` | Enemy defense broken |

## Communication Events

| Event | Payload | Description |
|---|---|---|
| `command` | `string` | Command sent to server |
| `sendCommand` | `{ command, echo?, options? }` | Emit to send a command |
| `printLine` | `string \| AnsiAwareBuffer` | Emit to print a line |
| `notify` | `{ text, time? }` | Show a notification |
| `executeFunctionalBind` | `void` | Fire the active functional bind |

## Timers / State Events

| Event | Payload | Description |
|---|---|---|
| `orderTimer` | `number \| null` | Rozkaz timer update |
| `lampTimer` | `number \| null` | Lamp timer update |
| `zaskTimer` | `{ seconds, ok } \| null` | Zask timer update |
| `transportTimer` | `TransportTimerPayload \| null` | Transport timer |
| `ping` | `number \| null` | Server ping |
| `moveModeChanged` | `number` | Move mode changed |

## Client Lifecycle Events

| Event | Payload | Description |
|---|---|---|
| `client.connect` | `void` | WebSocket connected |
| `client.disconnect` | `void` | WebSocket disconnected |
| `reset` | `void` | Client reset |
| `plugin:loaded` | `{ url, info }` | Plugin loaded successfully |
| `plugin:error` | `{ url, error }` | Plugin failed to load |
| `plugin:destroyed` | `{ url }` | Plugin destroyed |

## Clock Events

| Event | Payload | Description |
|---|---|---|
| `clock.update` | `ClockUpdatePayload` | Time/day update (`domain`, `hours`, `minutes`, `dayOfYear`, `season`, `daylight`, `sunrise`, `sunset`) |
| `clock.sunrise` | `{ domain, dayOfYear, observedHour, observedMinutes }` | Sunrise occurred |
| `clock.sunset` | `{ domain, dayOfYear, observedHour, observedMinutes }` | Sunset occurred |

## Map Events

| Event | Payload | Description |
|---|---|---|
| `mapMove` | `void` | Player moved (use `api.map.getRoom()` to get new room) |
| `renderMapLocation` | `{ locationId }` | Map cursor moved |
| `stepBack` | `void` | Map stepped back |
| `leadTo` | `number` | Walk-to started |
| `clearLeadTo` | `void` | Walk-to cleared |
| `mapDataChanged` | `void` | Map data reloaded |

## GMCP Events

Subscribe with `api.events.on("gmcp.char.state", handler)` etc.

| Event | Payload type |
|---|---|
| `gmcp` | `{ path: string; value: unknown }` — any GMCP update |
| `gmcp.char.info` | `GmcpCharInfo` |
| `gmcp.char.state` | `GmcpCharState` — hp, mana, fatigue, form, intox, etc. |
| `gmcp.char.options` | `GmcpCharOptions` |
| `gmcp.char.colors` | `GmcpCharColors` |
| `gmcp.room.info` | `GmcpRoomInfo` — room id, exits, hash, map coords |
| `gmcp.room.time` | `GmcpRoomTime` — daylight, season |
| `gmcp.objects.data` | `Map<number, ObjectData>` |
| `gmcp.objects.nums` | `[number[]]` |
| `gmcp.core.ping` | `void` |
| `gmcp.<any.path>` | `unknown` |

## GMCP Message Events (formatted text buffers)

These carry `AnsiAwareBuffer` content:

```typescript
api.events.on("gmcp_msg.room.long", (buf) => { ... })    // full room description
api.events.on("gmcp_msg.room.short", (buf) => { ... })   // short room description
api.events.on("gmcp_msg.room.exits", (buf) => { ... })   // exits line
api.events.on("gmcp_msg.combat.avatar", (buf) => { ... })
api.events.on("gmcp_msg.combat.team", (buf) => { ... })
api.events.on("gmcp_msg.comm", (buf) => { ... })
api.events.on("gmcp_msg.emotes", (buf) => { ... })
api.events.on("gmcp_msg.prompt", (buf) => { ... })
api.events.on("gmcp_msg.system", (buf) => { ... })
api.events.on("gmcp_msg.notification.common", (buf) => { ... })
// Also: room.item, room.contents.living, room.contents.object,
//       living.long, object.long, mail, notification.mail/knowledge/relations/boards
```

## Walker Events

| Event | Payload | Description |
|---|---|---|
| `walker.update` | `WalkerState` | Walker state changed (`active`, `paused`, `path`, `currentIndex`, `target`, `delay`) |
| `walker.stop` | `void` | Emit to stop walker |
| `walker.resume` | `void` | Emit to resume walker |
| `walker.setDelay` | `number` | Set walker delay |
| `walker.popup.open` | `void` | Open walker popup |

---

## Usage Examples

```typescript
// React to player moving
const onMove = () => {
  const room = api.map.getRoom();
  if (room) api.output.print(`Teraz jesteś w: ${room.name}`);
};
api.events.on("mapMove", onMove);

// React to HP change
const onState = (state: GmcpCharState) => {
  if (state.hp !== undefined && state.hp < 30) {
    api.output.print("NISKIE HP!");
  }
};
api.events.on("gmcp.char.state", onState);

// Always clean up in destroy()
export async function destroy() {
  api.events.off("mapMove", onMove);
  api.events.off("gmcp.char.state", onState);
}
```
