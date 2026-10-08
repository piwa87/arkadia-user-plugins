import '@arkadia/plugin-types';

// Raised by the client's Lua gags for attempted covers, retreats and breaks.
declare module '@arkadia/plugin-types' {
  interface ClientEvents {
    maneuverAttempted: void;
  }
}
