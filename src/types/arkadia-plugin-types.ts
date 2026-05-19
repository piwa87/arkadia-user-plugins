/**
 * Type declarations for the Arkadia plugin API.
 * This module provides the public API surface that plugins can use.
 */

/** An opaque color value produced by api.colors.fromHex. */
export interface Color {
  type: string;
  value: string;
}

/**
 * A color specification: either a structured Color object from api.colors.fromHex
 * or a raw ANSI color code number.
 */
export type ColorSpec = Color | number;

/** A mutable line of ANSI-aware text passed to trigger callbacks. */
export interface AnsiAwareLine {
  /** The raw text content of the line. */
  text: string;
  /** Apply a color to a character range on this line. */
  color(range: [number, number], color: ColorSpec): this;
  /** Replace a character range with new text. */
  replace(range: [number, number], replacement: string): this;
  /** Append text (optionally colored) to the end of this line. */
  append(text: string, color?: ColorSpec): this;
  /** Apply a color to all occurrences of a word or phrase on this line. */
  colorWords(words: string, color: ColorSpec): this;
  /** Create an independent copy of this line. */
  clone(): AnsiAwareLine;
}

/** An ANSI-aware text buffer that can be colored and printed. */
export interface AnsiAwareBuffer {
  color(range: [number, number], color: ColorSpec): this;
}

/** Constructor for AnsiAwareBuffer. */
export interface AnsiAwareBufferConstructor {
  new (text: string): AnsiAwareBuffer;
}

/** Handle returned by api.ui.registerFooterComponent. */
export interface FooterComponentHandle {
  element: HTMLSpanElement;
  setContent(content: string): void;
  setVisible(visible: boolean): void;
  remove(): void;
}

/** A map room. */
export interface Room {
  /** Unique room identifier (numeric ID represented as a string). */
  id: string;
  area: string;
  [key: string]: unknown;
}

/** A map room highlighter returned by api.map.createHighlighter. */
export interface MapHighlighter {
  add(roomIds: Array<string | number>): void;
}

/** A single herb bag containing herbs and their counts. */
export interface HerbBag {
  herbs: Record<string, number>;
}

/** GMCP character data. */
export interface GmcpData {
  char?: {
    info?: {
      race?: string;
      name?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** A person tracked by the people API. */
export interface Person {
  name: string;
  description: string;
  guild?: string;
  [key: string]: unknown;
}

/** An object present on the current location. */
export interface GameObject {
  desc?: string;
  shortcut?: string;
  __category?: string;
  [key: string]: unknown;
}

/** Callback for persistent triggers. Receives the line and optional regex matches.
 *  Return the (optionally modified) line, null to suppress the line, or void/undefined. */
export type TriggerCallback = (
  line: AnsiAwareLine,
  matches?: RegExpMatchArray,
) => AnsiAwareLine | null | void;

/** Callback for one-time triggers. Receives only the line. */
export type OneTimeTriggerCallback = (line: AnsiAwareLine) => AnsiAwareLine | null | void;

/** Callback for command aliases. Receives the regex matches (if any). */
export type AliasCallback = (matches?: RegExpMatchArray) => boolean | void;

/** Callback for command hooks. May transform or suppress the command. */
export type CommandHookCallback = (
  command: string,
  echo?: boolean,
  options?: unknown,
) => string | null | undefined;

/** Generic event listener callback. */
export type EventCallback = (...args: unknown[]) => void;

/** Options for trigger registration. */
export interface TriggerOptions {
  /**
   * Keeps the trigger's match context open for the given number of subsequent lines.
   * Used with parent triggers so that child triggers can fire on lines that follow
   * the parent match. For example, { stayOpenLines: 20 } keeps the context open
   * for up to 20 lines after the parent pattern matches, allowing child triggers
   * to detect food items in the room description that follows.
   */
  stayOpenLines?: number;
}

/** Handle returned by api.triggers.register, supporting child trigger registration. */
export interface TriggerHandle {
  /** Register a child trigger that fires within the context of this parent trigger. */
  registerChild(
    pattern: RegExp | string,
    callback: TriggerCallback,
    tag: string,
  ): TriggerHandle;
}

/** The main plugin API injected into every plugin's init function. */
export interface PluginApi {
  /** Color utilities. */
  colors: {
    /** Parse a CSS hex color string into an opaque Color value. */
    fromHex(hex: string): Color;
  };

  /** Trigger registration and management. */
  triggers: {
    /**
     * Register a persistent trigger.
     * The callback is invoked for every matching line and must return
     * the (optionally modified) line, null to suppress it, or void.
     * Returns a TriggerHandle that supports child trigger registration.
     */
    register(
      pattern: RegExp | string,
      callback: TriggerCallback,
      tag: string,
      options?: TriggerOptions,
    ): TriggerHandle;

    /**
     * Register a one-time trigger that fires once and then removes itself.
     */
    registerOneTime(
      pattern: RegExp | string,
      callback: OneTimeTriggerCallback,
      tag: string,
    ): void;

    /** Remove all triggers registered under the given tag. */
    removeByTag(tag: string): void;
  };

  /** Alias (command shortcut) registration. */
  aliases: {
    /**
     * Register a command alias.
     * Returns an opaque alias ID that can be used to unregister later.
     */
    register(pattern: RegExp, callback: AliasCallback): string;
  };

  /** Plugin-to-plugin and system event bus. */
  events: {
    emit(event: string, ...args: unknown[]): void;
    on(event: string, callback: EventCallback): void;
    off(event: string, callback: EventCallback): void;
  };

  /** Send raw MUD commands. */
  command: {
    send(command: string): void;
  };

  /** Intercept and optionally transform outgoing commands. */
  commandHooks: {
    /**
     * Register a command hook.
     * Returns an opaque hook ID that can be used to unregister later.
     */
    register(callback: CommandHookCallback, priority?: number): string;
    unregister(hookId: string): void;
  };

  /** World map access and navigation. */
  map: {
    getRoom(): Room | undefined;
    getRoomById(id: string | number): Room | undefined;
    getAreas(): unknown[];
    findPath(from: string, to: string): string[];
    setLocation(roomId: string | number): void;
    stepBack(): void;
    createHighlighter(options?: Record<string, unknown>): MapHighlighter;
  };

  /** Game output panel. */
  output: {
    print(text: string | AnsiAwareBuffer): void;
  };

  /** UI component registration. */
  ui: {
    registerFooterComponent(
      id: string,
      content: string,
      position?: 'start' | 'end' | number,
    ): FooterComponentHandle;
  };

  /** Key-bind management. */
  bind: {
    set(printable: string | null, callback?: () => void, clearAfterUse?: boolean): void;
    /** Returns the printable label of the currently bound key. */
    getLabel(): string;
  };

  /** Herb bag inventory. */
  herbs: {
    getBags(): Record<string, HerbBag | null | undefined> | undefined;
  };

  /** GMCP (Generic Mud Communication Protocol) data access. */
  gmcp: {
    get(): GmcpData | undefined;
  };

  /** People / character database. */
  people: {
    getAll(): Person[];
    makeKey(name: string, description: string): string;
    findByKey(key: string): Person | undefined;
    add(person: { name: string; description: string; guild?: string }): void;
    markEnemy(key: string): void;
    unmarkEnemy(key: string): void;
  };

  /** Party / team information. */
  team: {
    getMembers(): string[];
  };

  /** Objects on the current location. */
  objects: {
    getObjectsOnLocation(): GameObject[] | undefined;
  };

  /** Location notes (map annotations). */
  locationNotes: {
    set(roomId: string | number, note: string): void;
  };

  /** Constructor for building colored output buffers. */
  AnsiAwareBuffer: AnsiAwareBufferConstructor;
}

/** Metadata returned by a plugin's init function. */
export interface PluginInfo {
  name: string;
  version: string;
  description: string;
}
