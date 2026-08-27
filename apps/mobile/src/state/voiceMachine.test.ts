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

const SECOND_MEAL: InterpretedMeal = {
  ...HIGH_CONFIDENCE_MEAL,
  mealType: 'lunch',
  sourceText: 'three chapatis for lunch',
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

  it('moves to the interpretation state carrying a single-element events array (the common case)', () => {
    const next = voiceMachineReducer(
      { status: 'processing' },
      { type: 'INTERPRETED', events: [{ type: 'food', meal: HIGH_CONFIDENCE_MEAL }], sourceText: 'I ate a banana.' },
    );
    expect(next).toEqual({
      status: 'interpretation',
      events: [{ type: 'food', meal: HIGH_CONFIDENCE_MEAL }],
      sourceText: 'I ate a banana.',
    });
  });

  it('moves to the interpretation state carrying multiple events from one whole-day utterance', () => {
    const next = voiceMachineReducer(
      { status: 'processing' },
      {
        type: 'INTERPRETED',
        events: [
          { type: 'food', meal: HIGH_CONFIDENCE_MEAL },
          { type: 'food', meal: SECOND_MEAL },
          { type: 'exercise', activity: HIGH_CONFIDENCE_ACTIVITY },
        ],
        sourceText: 'breakfast, lunch, and a walk',
      },
    );
    expect(next.status).toBe('interpretation');
    if (next.status === 'interpretation') {
      expect(next.events).toHaveLength(3);
    }
  });

  it('UPDATE_MEAL edits only the event at the given index, leaving others untouched', () => {
    const interpretation: VoiceState = {
      status: 'interpretation',
      events: [{ type: 'food', meal: HIGH_CONFIDENCE_MEAL }, { type: 'food', meal: SECOND_MEAL }],
      sourceText: 'x',
    };
    const editedMeal = { ...SECOND_MEAL, estimatedTotals: { ...SECOND_MEAL.estimatedTotals, calories: 999 } };

    const next = voiceMachineReducer(interpretation, { type: 'UPDATE_MEAL', index: 1, meal: editedMeal });
    expect(next).toEqual({
      status: 'interpretation',
      events: [{ type: 'food', meal: HIGH_CONFIDENCE_MEAL }, { type: 'food', meal: editedMeal }],
      sourceText: 'x',
    });
  });

  it('UPDATE_MEAL is a no-op when not in the interpretation state', () => {
    const next = voiceMachineReducer(IDLE, { type: 'UPDATE_MEAL', index: 0, meal: HIGH_CONFIDENCE_MEAL });
    expect(next).toBe(IDLE);
  });

  it('UPDATE_MEAL is a no-op when the targeted index holds an exercise event', () => {
    const interpretation: VoiceState = {
      status: 'interpretation',
      events: [{ type: 'exercise', activity: HIGH_CONFIDENCE_ACTIVITY }],
      sourceText: 'I walked for 30 minutes.',
    };
    const next = voiceMachineReducer(interpretation, { type: 'UPDATE_MEAL', index: 0, meal: HIGH_CONFIDENCE_MEAL });
    expect(next).toBe(interpretation);
  });

  it('REMOVE_EVENT drops just that event, keeping the rest', () => {
    const interpretation: VoiceState = {
      status: 'interpretation',
      events: [{ type: 'food', meal: HIGH_CONFIDENCE_MEAL }, { type: 'food', meal: SECOND_MEAL }],
      sourceText: 'x',
    };
    const next = voiceMachineReducer(interpretation, { type: 'REMOVE_EVENT', index: 0 });
    expect(next).toEqual({ status: 'interpretation', events: [{ type: 'food', meal: SECOND_MEAL }], sourceText: 'x' });
  });

  it('REMOVE_EVENT returns to idle once the last event is removed', () => {
    const interpretation: VoiceState = {
      status: 'interpretation',
      events: [{ type: 'food', meal: HIGH_CONFIDENCE_MEAL }],
      sourceText: 'x',
    };
    const next = voiceMachineReducer(interpretation, { type: 'REMOVE_EVENT', index: 0 });
    expect(next).toEqual({ status: 'idle' });
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
      events: [{ type: 'food', meal: HIGH_CONFIDENCE_MEAL }],
      sourceText: 'x',
    };
    expect(voiceMachineReducer(interpretation, { type: 'RESET' })).toEqual({ status: 'idle' });
    expect(voiceMachineReducer({ status: 'recording' }, { type: 'CANCEL' })).toEqual({ status: 'idle' });
  });
});
