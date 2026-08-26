import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useRef, useState } from 'react';

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
 *
 * expo-speech-recognition's events are global (one native session, not
 * scoped per component), and bottom-tab screens stay mounted in the
 * background when you navigate away from them. Without the `isActiveRef`
 * guard below, every mounted `useVoiceRecognition()` instance — e.g. the
 * Coach tab sitting in the background — would receive results from a
 * recording session started on a completely different screen (observed in
 * practice: a meal logged by voice also landing as a Coach chat message).
 * Each instance now only reacts to a session *it* started.
 */
export function useVoiceRecognition(onFinalResult: (text: string) => void): UseVoiceRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isActiveRef = useRef(false);

  useSpeechRecognitionEvent('start', () => {
    if (!isActiveRef.current) return;
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    if (!isActiveRef.current) return;
    setIsListening(false);
    isActiveRef.current = false;
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (!isActiveRef.current) return;
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
    if (event.isFinal) {
      onFinalResult(text);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (!isActiveRef.current) return;
    setIsListening(false);
    isActiveRef.current = false;
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
      // Marked active only once permission is confirmed and right before the
      // native session actually starts, so a denied/failed start never
      // leaves this instance stuck "active" with no session behind it.
      isActiveRef.current = true;
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
    // Deliberately does NOT clear isActiveRef here — a manual stop still
    // needs to receive the final 'result' event that follows, which only
    // this active instance should process. `isActiveRef` clears itself on
    // the subsequent 'end' event instead.
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // no-op — already stopped or unsupported
    }
  }, []);

  return { isListening, transcript, error, start, stop };
}
