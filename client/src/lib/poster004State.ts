// Poster 004 reducer + state types.
//
// State split: this reducer owns ONLY the fields that the React tree
// reads (phase, focusCarrier, hasSeenCarrier, hoverInstructionVisible).
// All high-frequency animation values — per-form alphas, pulse
// positions, per-carrier pulse-scale, per-sector blip phase, connector
// and label opacities — live in the engine's AnimState (mutable ref),
// outside React entirely.

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
  hasSeenCarrier: Record<CarrierId, boolean>;
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

const emptySeen: Record<CarrierId, boolean> = {
  petroleum: false,
  naturalGas: false,
  electricity: false,
  bioenergy: false,
  heat: false,
  solidFuel: false,
};

const allSeen: Record<CarrierId, boolean> = {
  petroleum: true,
  naturalGas: true,
  electricity: true,
  bioenergy: true,
  heat: true,
  solidFuel: true,
};

export const initialState: State = {
  phase: 'DEFAULT',
  focusCarrier: null,
  hasSeenCarrier: { ...emptySeen },
  hoverInstructionVisible: false,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CASCADE_FULL_START': {
      if (state.phase !== 'DEFAULT') return state;
      return {
        ...state,
        phase: 'CASCADE_FULL',
        focusCarrier: null,
        hoverInstructionVisible: false,
      };
    }

    case 'CASCADE_FULL_COMPLETE': {
      if (state.phase !== 'CASCADE_FULL') return state;
      // Cascade reveals every carrier — mark all as seen so the
      // "Play animation" button can hide once the user has
      // observed at least one full pass.
      return {
        ...state,
        phase: 'FULL',
        hasSeenCarrier: { ...allSeen },
      };
    }

    case 'ENTER_CARRIER_FOCUS': {
      if (state.phase !== 'FULL') return state;
      if (state.focusCarrier === action.carrier) return state;
      return {
        ...state,
        focusCarrier: action.carrier,
        hasSeenCarrier: {
          ...state.hasSeenCarrier,
          [action.carrier]: true,
        },
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
        hasSeenCarrier: { ...allSeen },
        hoverInstructionVisible: false,
      };
    }

    case 'RESET': {
      return {
        ...state,
        phase: 'DEFAULT',
        focusCarrier: null,
        hasSeenCarrier: { ...emptySeen },
        hoverInstructionVisible: false,
      };
    }

    case 'SHOW_HOVER_INSTRUCTION': {
      if (state.phase !== 'DEFAULT') return state;
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
