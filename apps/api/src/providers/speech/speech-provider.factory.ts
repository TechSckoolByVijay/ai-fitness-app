import type { Env } from '../../config/env';
import { MockSpeechProvider } from './mock-speech.provider';
import type { SpeechProvider } from './speech-provider.interface';
import { WhisperSpeechProvider } from './whisper.provider';

export function createSpeechProvider(env: Env): SpeechProvider {
  if (env.MOCK_SPEECH || !env.SPEECH_API_KEY) {
    return new MockSpeechProvider();
  }
  return new WhisperSpeechProvider(env.SPEECH_API_KEY);
}
