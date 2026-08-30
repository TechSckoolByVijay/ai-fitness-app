import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, UIManager, View } from 'react-native';
import { buildHomeSummary, type HomeSummaryInput } from '../utils/homeSummary';
import { ProgressBar } from './ui/ProgressBar';
import { Text } from './ui/Text';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface TodaySummaryCardProps extends HomeSummaryInput {
  /** Shown in the expanded breakdown so the arithmetic is complete. */
  onExplainPress?: () => void;
}

function LedgerRow({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <View
      className={`flex-row items-center justify-between py-1 ${
        total ? 'mt-1 border-t border-white/30 pt-2' : ''
      }`}
    >
      <Text className={`text-[13.5px] text-white/85 ${total ? 'font-bold text-white' : ''}`}>{label}</Text>
      <Text
        className={`text-[13.5px] text-white/85 ${total ? 'font-bold text-white' : ''}`}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * Today's calories and protein, as two plain sentences.
 *
 * The previous card showed "805 / 1,331" and "18 / 84 g" — a ceiling and a
 * floor drawn identically, so the reader could not tell that one was going
 * well and the other badly. It also never said the goal, leaving "budget"
 * ambiguous between a target to reach and a limit to stay under.
 *
 * The maths is not deleted, only folded away: "More" reveals the full
 * budget/eaten/burned breakdown, so a number nobody trusts can always be
 * checked.
 */
export function TodaySummaryCard(props: TodaySummaryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const summary = buildHomeSummary(props);

  // Only a passed calorie ceiling is a warning. Falling short of a protein
  // floor is "not done yet", and must not be coloured like a failure.
  const surface = summary.isOverCeiling
    ? 'bg-danger-600 shadow-danger-600/30'
    : 'bg-primary-500 shadow-primary-500/30';

  const eaten = Math.round(props.caloriesConsumed);
  const burned = Math.round(props.activeCalories);

  return (
    <View className={`rounded-3xl p-6 shadow-md ${surface}`}>
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-bold uppercase tracking-widest text-white/80">Today</Text>
        <View className="flex-row items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1">
          <Text className="text-[12px] font-bold text-white">{summary.isOverCeiling ? '⚠' : '✓'}</Text>
          <Text className="text-[12px] font-bold uppercase tracking-wide text-white">
            {summary.isOverCeiling ? 'Over' : 'On track'}
          </Text>
        </View>
      </View>

      <Text className="mt-3 text-[19px] font-bold leading-[26px] text-white">{summary.calorieSentence}</Text>
      {summary.proteinSentence ? (
        <Text className="mt-1.5 text-[19px] font-bold leading-[26px] text-white">
          {summary.proteinSentence}
        </Text>
      ) : null}

      {summary.goalSentence ? (
        <Text className="mt-2.5 text-[13.5px] font-medium text-white/75">{summary.goalSentence}</Text>
      ) : null}

      {expanded ? (
        <View className="mt-4 rounded-2xl bg-black/15 p-4">
          <Text className="text-[11px] font-bold uppercase tracking-widest text-white/70">Calories</Text>
          <View className="mt-1.5">
            <LedgerRow label="Daily target" value={(props.calorieTarget ?? 0).toLocaleString()} />
            <LedgerRow label="Eaten" value={`− ${eaten.toLocaleString()}`} />
            <LedgerRow label="Burned by activity" value={`+ ${burned.toLocaleString()}`} />
            <LedgerRow
              label={summary.stance === 'floor' ? 'Still to eat' : 'Can still eat'}
              value={(summary.caloriesRemaining ?? 0).toLocaleString()}
              total
            />
          </View>

          {props.proteinTarget != null ? (
            <View className="mt-4">
              <Text className="text-[11px] font-bold uppercase tracking-widest text-white/70">Protein</Text>
              <View className="mt-2">
                <ProgressBar
                  value={props.proteinConsumed}
                  target={props.proteinTarget}
                  colorClassName="bg-white"
                  trackClassName="bg-white/25"
                />
              </View>
              <Text className="mt-2 text-[13px] text-white/80">
                {Math.round(props.proteinConsumed)} g of {props.proteinTarget} g — aim to reach this, not
                stay under it. Protein protects muscle while you lose fat.
              </Text>
            </View>
          ) : null}

          <Text className="mt-4 text-[12px] text-white/60">
            Calorie and macro figures are estimates.
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide the calculation' : 'Show how this is calculated'}
        accessibilityState={{ expanded }}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExpanded((v) => !v);
        }}
        className="mt-3 flex-row items-center gap-1 self-start rounded-full bg-black/20 px-3 py-1.5"
      >
        <Text className="text-[12.5px] font-bold text-white">{expanded ? 'Less' : 'More'}</Text>
        <Text className="text-[11px] font-bold text-white">{expanded ? '▲' : '▼'}</Text>
      </Pressable>
    </View>
  );
}
