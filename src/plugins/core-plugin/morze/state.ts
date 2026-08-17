/**
 * Shared state for sea/diving/pearl modules.
 * Mirrors the CMUD @var definitions from mod_morza.
 */

export interface MorzeState {
  /** Surface immediately flag — set when wyp! is used. */
  wyplyn: boolean;
  /** Auto-dive flag — keeps diving until glebokoscCel is reached. */
  nurkuj: boolean;
  /** Current depth (0 = surface). */
  glebokoscAkt: number;
  /** Target depth for auto-dive. */
  glebokoscCel: number;
  /** Seaweed collecting mode flag. */
  wodorosty: boolean;
  /** Direction to move after taking seaweed. */
  wodorostyKier: string;
  /** Pearl diver mode (nurek!). */
  nurek: boolean;
  /** Seaweed present at current location flag. */
  saWodo: boolean;
  /** Amber searching mode flag. */
  bur: boolean;
  /** Module on/off flag. */
  enabled: boolean;
}

export function createMorzeState(): MorzeState {
  return {
    wyplyn: false,
    nurkuj: false,
    glebokoscAkt: 0,
    glebokoscCel: 3,
    wodorosty: false,
    wodorostyKier: 'n',
    nurek: false,
    saWodo: false,
    bur: false,
    enabled: false,
  };
}

/** Reset all activity flags — used by qu and emergency exit. */
export function resetMorzeFlags(state: MorzeState): void {
  state.bur = false;
  state.nurek = false;
  state.nurkuj = false;
  state.wodorosty = false;
  state.wyplyn = false;
  state.glebokoscAkt = 0;
}