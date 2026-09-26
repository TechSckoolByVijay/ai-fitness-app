import type { ExportKind } from '@fitness-app/shared';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { ApiError } from '../src/api/client';
import { fetchExportCsv, type ExportRange } from '../src/api/export.api';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { Chip } from '../src/components/ui/Chip';
import { DateField } from '../src/components/ui/DateField';
import { Text } from '../src/components/ui/Text';
import { useRequireAuth } from '../src/hooks/useRequireAuth';
import { PRESET_DAYS, customRangeError, exportFilename, presetLabel } from '../src/utils/exportRange';
import { shareCsv } from '../src/utils/shareCsv';

type RangeChoice = number | 'custom';

const FILES: Array<{ kind: ExportKind; title: string; description: string }> = [
  {
    kind: 'food',
    title: 'Food log',
    description:
      'One row per food: date, time (when you gave one), meal, amount, calories, protein, carbs, fat — and what you said.',
  },
  {
    kind: 'days',
    title: 'Daily summary',
    description:
      'One row per day: calories against your target, deficit or surplus, protein against your target, water, weight, sleep, steps.',
  },
];

export default function ExportScreen() {
  const isAuthenticated = useRequireAuth();
  const [choice, setChoice] = useState<RangeChoice>(30);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-light dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#12c06e" />
      </View>
    );
  }

  const rangeError = choice === 'custom' ? customRangeError(from, to) : null;
  const range: ExportRange | null =
    choice === 'custom' ? (rangeError ? null : { from, to }) : { days: choice };

  const runExport = async (kind: ExportKind) => {
    if (!range) return;
    setBusy(kind);
    setError(null);
    try {
      const csv = await fetchExportCsv(kind, range);
      await shareCsv(exportFilename(kind, range), csv);
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : 'Export failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView className="flex-1 bg-surface-light dark:bg-surface-dark" contentContainerClassName="gap-4 p-5">
      <Text variant="body">
        Your data is yours. Export it as a spreadsheet file and open it in Excel or Google Sheets, build your own
        dashboard, or hand it to any AI you like — Claude, ChatGPT, Gemini — and ask your own questions.
      </Text>

      <Card className="gap-3">
        <Text variant="subtitle">How far back?</Text>
        <View className="flex-row flex-wrap gap-2">
          {PRESET_DAYS.map((days) => (
            <Chip key={days} label={presetLabel(days)} selected={choice === days} onPress={() => setChoice(days)} />
          ))}
          <Chip label="Pick dates" selected={choice === 'custom'} onPress={() => setChoice('custom')} />
        </View>
        {choice === 'custom' ? (
          <View className="gap-2">
            <Text variant="caption">From</Text>
            <DateField
              value={from}
              onChange={setFrom}
              placeholder="Start date"
              initialDate={new Date()}
              maximumDate={new Date()}
              accessibilityLabel="Export start date"
            />
            <Text variant="caption">To</Text>
            <DateField
              value={to}
              onChange={setTo}
              placeholder="End date"
              initialDate={new Date()}
              maximumDate={new Date()}
              accessibilityLabel="Export end date"
            />
            {rangeError && (from || to) ? (
              <Text variant="caption" className="text-amber-600 dark:text-amber-400">
                {rangeError}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Card>

      {FILES.map((file) => (
        <Card key={file.kind} className="gap-2">
          <Text variant="subtitle">{file.title}</Text>
          <Text variant="caption">{file.description}</Text>
          <Button
            label={`Export ${file.title.toLowerCase()}`}
            onPress={() => void runExport(file.kind)}
            loading={busy === file.kind}
            disabled={!range || busy !== null}
            className="mt-1"
          />
        </Card>
      ))}

      {error ? (
        <Text variant="caption" className="text-center text-red-500">
          {error}
        </Text>
      ) : null}

      <Text variant="caption" className="text-center">
        Numbers are estimates, the same ones the app shows you. Days are counted in your own time zone.
      </Text>
    </ScrollView>
  );
}
