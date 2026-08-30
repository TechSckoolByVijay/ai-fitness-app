import { buildHomeSummary, type HomeSummaryInput } from './homeSummary';

/** The real figures from the screenshot that prompted this rewrite. */
const REAL: HomeSummaryInput = {
  goalType: 'lose_weight',
  calorieTarget: 1331,
  caloriesConsumed: 805,
  activeCalories: 0,
  proteinTarget: 84,
  proteinConsumed: 18,
};

describe('buildHomeSummary', () => {
  it('answers both questions in plain language', () => {
    const s = buildHomeSummary(REAL);
    expect(s.calorieSentence).toBe('You can eat 526 kcal more today.');
    expect(s.proteinSentence).toBe('You need 66 g more protein.');
    expect(s.goalSentence).toBe('Staying under 1,331 kcal keeps you losing weight.');
  });

  it('adds exercise back into what is left', () => {
    const s = buildHomeSummary({ ...REAL, activeCalories: 200 });
    expect(s.caloriesRemaining).toBe(726);
  });

  describe('the target means opposite things per goal', () => {
    it('reads as a ceiling when losing — room left is permission to eat', () => {
      const s = buildHomeSummary(REAL);
      expect(s.stance).toBe('ceiling');
      expect(s.calorieSentence).toMatch(/can eat/);
      expect(s.goalSentence).toMatch(/under/);
    });

    it('reads as a floor when gaining — room left is work still to do', () => {
      const s = buildHomeSummary({ ...REAL, goalType: 'gain_muscle' });
      expect(s.stance).toBe('floor');
      expect(s.calorieSentence).toBe('Eat 526 kcal more to reach today\'s target.');
      expect(s.goalSentence).toMatch(/Reaching/);
    });

    it('reads as a band when maintaining', () => {
      const s = buildHomeSummary({ ...REAL, goalType: 'maintain_weight' });
      expect(s.stance).toBe('band');
      expect(s.goalSentence).toMatch(/steady/);
    });
  });

  describe('going past the target', () => {
    it('is a warning when losing', () => {
      const s = buildHomeSummary({ ...REAL, caloriesConsumed: 1500 });
      expect(s.calorieSentence).toBe('You\'re 169 kcal over today\'s limit.');
      expect(s.isOverCeiling).toBe(true);
    });

    it('is NOT a warning when gaining — passing a floor is the goal', () => {
      const s = buildHomeSummary({ ...REAL, goalType: 'gain_muscle', caloriesConsumed: 1500 });
      expect(s.calorieSentence).toMatch(/good for gaining/);
      expect(s.isOverCeiling).toBe(false);
    });
  });

  describe('protein is always a floor', () => {
    it('states what is still needed', () => {
      expect(buildHomeSummary(REAL).proteinRemaining).toBe(66);
    });

    it('congratulates rather than warning once reached', () => {
      const s = buildHomeSummary({ ...REAL, proteinConsumed: 90 });
      expect(s.proteinSentence).toMatch(/reached/);
      // Exceeding protein must never read as a failure the way exceeding
      // calories does.
      expect(s.isOverCeiling).toBe(false);
    });

    it('never turns the card into a warning by itself', () => {
      const s = buildHomeSummary({ ...REAL, proteinConsumed: 0 });
      expect(s.isOverCeiling).toBe(false);
    });
  });

  it('asks for body info rather than inventing a target', () => {
    const s = buildHomeSummary({ ...REAL, calorieTarget: null });
    expect(s.calorieSentence).toMatch(/Set your body info/);
    expect(s.goalSentence).toBeNull();
    expect(s.caloriesRemaining).toBeNull();
  });

  it('omits protein wording when no protein target exists', () => {
    const s = buildHomeSummary({ ...REAL, proteinTarget: null });
    expect(s.proteinSentence).toBeNull();
    expect(s.proteinRemaining).toBeNull();
  });

  it('treats a goal with no calorie direction as a ceiling', () => {
    // improve_sleep and friends carry no calorie adjustment; the safe
    // reading is "this is the most you should eat".
    expect(buildHomeSummary({ ...REAL, goalType: 'improve_sleep' }).stance).toBe('ceiling');
    expect(buildHomeSummary({ ...REAL, goalType: null }).stance).toBe('ceiling');
  });
});
