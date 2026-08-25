import type { SpeechProvider, TranscriptionResult } from './speech-provider.interface';

/**
 * Canned transcripts keyed by id — used by the mobile mock-mode fallback UI
 * (quick-phrase buttons) when real mic capture isn't available in Expo Go.
 */
export const MOCK_TRANSCRIPTS: Record<string, string> = {
  banana: 'I ate a banana.',
  'two-bananas': 'I had two bananas.',
  'chapati-curry-salad':
    "At 12 o'clock I ate two medium chapatis, around 200 grams of less-oily medium-spicy curry, and a bowl of salad.",
  'bowl-curry': 'I had a bowl of curry.',
  'some-curry': 'I had some curry.',
  dal: 'I had 200 grams of dal.',
  'tea-sugar': 'I had tea with two teaspoons of sugar.',
};

export class MockSpeechProvider implements SpeechProvider {
  async transcribe({
    audioBase64,
    mockTranscriptId,
  }: {
    audioBase64?: string;
    mockTranscriptId?: string;
  }): Promise<TranscriptionResult> {
    if (mockTranscriptId) {
      const text = MOCK_TRANSCRIPTS[mockTranscriptId];
      if (!text) {
        throw new Error(`Unknown mockTranscriptId "${mockTranscriptId}"`);
      }
      return { text, confidence: 0.95 };
    }

    if (audioBase64) {
      throw new Error(
        'Audio transcription is not available in mock mode. Send `text` or `mockTranscriptId` instead.',
      );
    }

    throw new Error('No audio or mockTranscriptId provided to transcribe.');
  }
}
