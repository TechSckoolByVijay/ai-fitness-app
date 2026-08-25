import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useState } from 'react';

interface UseVoiceRecognitionResult {
  isListening: boolean;
  transcript: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * Wraps expo-speech-recognition, which uses the SAME JS API on web (backed
 * by the browser's built-in Web Speech API — free, no setup) and native
 * (backed by the phone's on-device speech engine, once a Dev Build includes
 * the config plugin). Falls back gracefully — the caller keeps a manual
 * text-entry option visible for when permission is denied or the platform
 * doesn't support speech recognition (e.g. Firefox) — never blocks logging
 * on voice working (spec section 35: never lose the user's input).
 */
export function useVoiceRecognition(onFinalResult: (text: string) => void): UseVoiceRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
    if (event.isFinal) {
      onFinalResult(text);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    setError(event.message || 'Could not hear that — try typing instead.');
  });

  const start = useCallback(async () => {
    setTranscript('');
    setError(null);
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone permission is required for voice logging.');
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch {
      setError('Voice input is not available here — try typing instead.');
    }
  }, []);

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // no-op — already stopped or unsupported
    }
  }, []);

  return { isListening, transcript, error, start, stop };
}
