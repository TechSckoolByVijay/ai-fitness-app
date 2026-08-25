import type { SpeechProvider, TranscriptionResult } from './speech-provider.interface';

/** Real provider stub — not implemented in Phase 1 (no SPEECH_API_KEY available). */
export class WhisperSpeechProvider implements SpeechProvider {
  constructor(private readonly apiKey: string) {}

  async transcribe(): Promise<TranscriptionResult> {
    throw new Error(
      'WhisperSpeechProvider is not implemented yet. Set MOCK_SPEECH=true or implement transcribe().',
    );
  }
}
