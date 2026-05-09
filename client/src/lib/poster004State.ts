// Poster 004 reducer + state types.
//
// State split: this reducer owns ONLY the fields that the React tree
// reads (phase, focusCarrier, hasCompletedCascade, hasFocusedCarrier,
// hoverInstructionVisible). All high-frequency animation values —
// per-form alphas, pulse positions, per-carrier pulse-scale, per-sector
// blip phase, connector and label opacities, connector draw-in
// progress — live in the engine's AnimState (mutable ref), outside
// React entirely.

export type Phase = 'DEFAULT' | 'CASCADE_FULL' | 'FULL';

export type CarrierId =
  | 'petroleum'
  | 'naturalGas'
  | 'electricity'
  | 'bioenergy'
  | 'heat'
  | 'solidFuel';

export const CARRIER_IDS: CarrierId[] = [
  'petroleum',
  'naturalGas',
  'electricity',
  'bioenergy',
  'heat',
  'solidFuel',
];

export interface State {
  phase: Phase;
  focusCarrier: CarrierId | null;
  // True after the first full cascade has played to completion.
  // Controls visibility of the "Play animation" button.
  hasCompletedCascade: boolean;
  // True after the user has focused at least one carrier.
  // Controls whether the hover instruction reappears post-cascade.
  hasFocusedCarrier: boolean;
  hoverInstructionVisible: boolean;
}

export type Action =
  | { type: 'CASCADE_FULL_START' }
  | { type: 'CASCADE_FULL_COMPLETE' }
  | { type: 'ENTER_CARRIER_FOCUS'; carrier: CarrierId }
  | { type: 'EXIT_CARRIER_FOCUS' }
  | { type: 'RESET' }
  | { type: 'SNAP_TO_FULL' }
  | { type: 'SHOW_HOVER_INSTRUCTION' }
  | { type: 'HIDE_HOVER_INSTRUCTION' };

export const initialState: State = {
  phase: 'DEFAULT',
  focusCarrier: null,
  hasCompletedCascade: false,
  hasFocusedCarrier: false,
  hoverInstructionVisible: false,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CASCADE_FULL_START': {
      // Cascade can fire from DEFAULT or FULL — replay is allowed.
      // Only ignored if a cascade is already in flight.
      if (state.phase === 'CASCADE_FULL') return state;
      return {
        ...state,
        phase: 'CASCADE_FULL',
        focusCarrier: null,
        hoverInstructionVisible: false,
      };
    }

    case 'CASCADE_FULL_COMPLETE': {
      if (state.phase !== 'CASCADE_FULL') return state;
      return {
        ...state,
        phase: 'FULL',
        hasCompletedCascade: true,
        // Re-show the instruction post-cascade if the user hasn't
        // yet hovered any carrier — invites carrier exploration.
        hoverInstructionVisible: !state.hasFocusedCarrier,
      };
    }

    case 'ENTER_CARRIER_FOCUS': {
      if (state.phase !== 'FULL') return state;
      if (state.focusCarrier === action.carrier) return state;
      return {
        ...state,
        focusCarrier: action.carrier,
        hasFocusedCarrier: true,
        hoverInstructionVisible: false,
      };
    }

    case 'EXIT_CARRIER_FOCUS': {
      if (state.focusCarrier === null) return state;
      return { ...state, focusCarrier: null };
    }

    case 'SNAP_TO_FULL': {
      return {
        ...state,
        phase: 'FULL',
        focusCarrier: null,
        hasCompletedCascade: true,
        hasFocusedCarrier: true,
        hoverInstructionVisible: false,
      };
    }

    case 'RESET': {
      return {
        ...state,
        phase: 'DEFAULT',
        focusCarrier: null,
        hasCompletedCascade: false,
        hasFocusedCarrier: false,
        hoverInstructionVisible: false,
      };
    }

    case 'SHOW_HOVER_INSTRUCTION': {
      if (state.phase === 'CASCADE_FULL') return state;
      if (state.hasFocusedCarrier) return state;
      if (state.hoverInstructionVisible) return state;
      return { ...state, hoverInstructionVisible: true };
    }

    case 'HIDE_HOVER_INSTRUCTION': {
      if (!state.hoverInstructionVisible) return state;
      return { ...state, hoverInstructionVisible: false };
    }

    default:
      return state;
  }
}
