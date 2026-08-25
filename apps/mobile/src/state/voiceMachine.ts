import type { InterpretedHealthEvent, InterpretedMeal } from '@fitness-app/shared';
import { useReducer } from 'react';

export type VoiceState =
  | { status: 'idle' }
  | { status: 'recording' }
  | { status: 'processing' }
  | { status: 'interpretation'; event: InterpretedHealthEvent; sourceText: string }
  | { status: 'error'; message: string; retryText?: string };

type VoiceAction =
  | { type: 'START_RECORDING' }
  | { type: 'CANCEL' }
  | { type: 'SUBMIT' }
  | { type: 'INTERPRETED'; event: InterpretedHealthEvent; sourceText: string }
  | { type: 'UPDATE_MEAL'; meal: InterpretedMeal }
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
      return { status: 'interpretation', event: action.event, sourceText: action.sourceText };
    case 'UPDATE_MEAL':
      if (_state.status !== 'interpretation' || _state.event.type !== 'food') return _state;
      return { ..._state, event: { type: 'food', meal: action.meal } };
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
