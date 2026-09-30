import '@arkadia/plugin-types';

// Emitted by the client's Lua gags and weaponState script, but missing from
// the published plugin-types package. See clientEvents.ts in the client.
declare module '@arkadia/plugin-types' {
  interface ClientEvents {
    weaponKnockedOff: void;
    weapon_state: boolean;
  }
}
