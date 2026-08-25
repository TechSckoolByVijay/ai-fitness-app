import type { InterpretedActivity, InterpretedMeal } from '@fitness-app/shared';
import { voiceMachineReducer, type VoiceState } from './voiceMachine';

const IDLE: VoiceState = { status: 'idle' };

const HIGH_CONFIDENCE_MEAL: InterpretedMeal = {
  mealType: 'snack',
  loggedAt: '2026-08-25T09:00:00.000Z',
  sourceText: 'I ate a banana.',
  items: [
    {
      name: 'banana',
      quantity: 1,
      unit: 'whole',
      confidence: 0.9,
      tier: 'high',
      nutrition: { calories: 105, proteinG: 1.3, carbsG: 27.1, fatG: 0.4, fiberG: 3.1, isEstimate: true, source: 'mock' },
    },
  ],
  tier: 'high',
  autoLog: true,
  estimatedTotals: { calories: 105, proteinG: 1.3, carbsG: 27.1, fatG: 0.4, fiberG: 3.1, isEstimate: true, source: 'mock' },
};

const HIGH_CONFIDENCE_ACTIVITY: InterpretedActivity = {
  activityType: 'walking',
  loggedAt: '2026-08-25T09:00:00.000Z',
  sourceText: 'I walked for 30 minutes.',
  durationMinutes: 30,
  caloriesBurned: 122.5,
  confidence: 0.9,
  tier: 'high',
  autoLog: true,
};

describe('voiceMachineReducer', () => {
  it('starts idle and moves to recording on START_RECORDING', () => {
    const next = voiceMachineReducer(IDLE, { type: 'START_RECORDING' });
    expect(next).toEqual({ status: 'recording' });
  });

  it('moves to processing on SUBMIT from idle or recording', () => {
    expect(voiceMachineReducer(IDLE, { type: 'SUBMIT' })).toEqual({ status: 'processing' });
    expect(voiceMachineReducer({ status: 'recording' }, { type: 'SUBMIT' })).toEqual({ status: 'processing' });
  });

  it('moves to the interpretation state carrying a food event and source text', () => {
    const next = voiceMachineReducer(
      { status: 'processing' },
      { type: 'INTERPRETED', event: { type: 'food', meal: HIGH_CONFIDENCE_MEAL }, sourceText: 'I ate a banana.' },
    );
    expect(next).toEqual({
      status: 'interpretation',
      event: { type: 'food', meal: HIGH_CONFIDENCE_MEAL },
      sourceText: 'I ate a banana.',
    });
  });

  it('moves to the interpretation state carrying an exercise event and source text', () => {
    const next = voiceMachineReducer(
      { status: 'processing' },
      {
        type: 'INTERPRETED',
        event: { type: 'exercise', activity: HIGH_CONFIDENCE_ACTIVITY },
        sourceText: 'I walked for 30 minutes.',
      },
    );
    expect(next).toEqual({
      status: 'interpretation',
      event: { type: 'exercise', activity: HIGH_CONFIDENCE_ACTIVITY },
      sourceText: 'I walked for 30 minutes.',
    });
  });

  it('UPDATE_MEAL only applies while in the interpretation state for a food event (item edited/removed)', () => {
    const interpretation: VoiceState = {
      status: 'interpretation',
      event: { type: 'food', meal: HIGH_CONFIDENCE_MEAL },
      sourceText: 'I ate a banana.',
    };
    const editedMeal = { ...HIGH_CONFIDENCE_MEAL, estimatedTotals: { ...HIGH_CONFIDENCE_MEAL.estimatedTotals, calories: 210 } };

    const next = voiceMachineReducer(interpretation, { type: 'UPDATE_MEAL', meal: editedMeal });
    expect(next).toEqual({
      status: 'interpretation',
      event: { type: 'food', meal: editedMeal },
      sourceText: 'I ate a banana.',
    });
  });

  it('UPDATE_MEAL is a no-op when not in the interpretation state', () => {
    const next = voiceMachineReducer(IDLE, { type: 'UPDATE_MEAL', meal: HIGH_CONFIDENCE_MEAL });
    expect(next).toBe(IDLE);
  });

  it('UPDATE_MEAL is a no-op when the interpretation state holds an exercise event', () => {
    const interpretation: VoiceState = {
      status: 'interpretation',
      event: { type: 'exercise', activity: HIGH_CONFIDENCE_ACTIVITY },
      sourceText: 'I walked for 30 minutes.',
    };
    const next = voiceMachineReducer(interpretation, { type: 'UPDATE_MEAL', meal: HIGH_CONFIDENCE_MEAL });
    expect(next).toBe(interpretation);
  });

  it('moves to an error state retaining the original text for retry (never lose spoken input)', () => {
    const next = voiceMachineReducer(
      { status: 'processing' },
      { type: 'FAILED', message: 'Network request failed', retryText: 'I ate a banana.' },
    );
    expect(next).toEqual({ status: 'error', message: 'Network request failed', retryText: 'I ate a banana.' });
  });

  it('RESET and CANCEL both return to idle from any state', () => {
    const interpretation: VoiceState = {
      status: 'interpretation',
      event: { type: 'food', meal: HIGH_CONFIDENCE_MEAL },
      sourceText: 'x',
    };
    expect(voiceMachineReducer(interpretation, { type: 'RESET' })).toEqual({ status: 'idle' });
    expect(voiceMachineReducer({ status: 'recording' }, { type: 'CANCEL' })).toEqual({ status: 'idle' });
  });
});
