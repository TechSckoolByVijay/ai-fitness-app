import { STEP_INTERVAL_MS, TEXT_STEPS, activeStepIndex } from './analyzingSteps';

describe('activeStepIndex', () => {
  it('starts on the first step', () => {
    expect(activeStepIndex(0, TEXT_STEPS.length)).toBe(0);
  });

  it('advances one step per interval', () => {
    expect(activeStepIndex(STEP_INTERVAL_MS * 2 + 10, TEXT_STEPS.length)).toBe(2);
  });

  it('waits on the last step however long the request takes', () => {
    expect(activeStepIndex(60_000, TEXT_STEPS.length)).toBe(TEXT_STEPS.length - 1);
  });
});
