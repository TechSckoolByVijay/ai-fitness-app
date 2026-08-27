import type { InterpretedHealthEvent, InterpretedMeal } from '@fitness-app/shared';
import { useReducer } from 'react';

export type VoiceState =
  | { status: 'idle' }
  | { status: 'recording' }
  | { status: 'processing' }
  | { status: 'interpretation'; events: InterpretedHealthEvent[]; sourceText: string }
  | { status: 'error'; message: string; retryText?: string };

type VoiceAction =
  | { type: 'START_RECORDING' }
  | { type: 'CANCEL' }
  | { type: 'SUBMIT' }
  | { type: 'INTERPRETED'; events: InterpretedHealthEvent[]; sourceText: string }
  | { type: 'UPDATE_MEAL'; index: number; meal: InterpretedMeal }
  /** One event in a multi-event batch confirmed or dismissed — drops it from the list, or returns to idle once none remain. */
  | { type: 'REMOVE_EVENT'; index: number }
  | { type: 'FAILED'; message: string; retryText?: string }
  | { type: 'RESET' };

export type { VoiceAction };

export function voiceMachineReducer(_state: VoiceState, action: VoiceAction): VoiceState {
  switch (action.type) {
    case 'START_RECORDING':
      return { status: 'recording' };
    case 'SUBMIT':
      return { status: 'processing' };
    case 'INTERPRETED':
      return { status: 'interpretation', events: action.events, sourceText: action.sourceText };
    case 'UPDATE_MEAL': {
      if (_state.status !== 'interpretation') return _state;
      const event = _state.events[action.index];
      if (!event || event.type !== 'food') return _state;
      const events = [..._state.events];
      events[action.index] = { type: 'food', meal: action.meal };
      return { ..._state, events };
    }
    case 'REMOVE_EVENT': {
      if (_state.status !== 'interpretation') return _state;
      const events = _state.events.filter((_, i) => i !== action.index);
      if (events.length === 0) return { status: 'idle' };
      return { ..._state, events };
    }
    case 'FAILED':
      return { status: 'error', message: action.message, retryText: action.retryText };
    case 'CANCEL':
    case 'RESET':
      return { status: 'idle' };
    default:
      return _state;
  }
}

export function useVoiceMachine() {
  return useReducer(voiceMachineReducer, { status: 'idle' } as VoiceState);
}
