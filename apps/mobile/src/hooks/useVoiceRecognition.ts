import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useRef, useState } from 'react';
import { isPauseError, MAX_LISTEN_MS, shouldResumeListening } from '../utils/voiceSession';

interface UseVoiceRecognitionResult {
  isListening: boolean;
  transcript: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

interface UseVoiceRecognitionOptions {
  /**
   * Keep listening through pauses until `stop()` is called. Each finished
   * phrase still reaches `onFinalResult` as it arrives, so the caller must
   * append rather than act on it (the meal screen does; the coach, which
   * sends every final result as a message, must not opt in).
   */
  keepListening?: boolean;
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
export function useVoiceRecognition(
  onFinalResult: (text: string) => void,
  { keepListening = false }: UseVoiceRecognitionOptions = {},
): UseVoiceRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isActiveRef = useRef(false);
  // keepListening bookkeeping: whether the user still wants the mic open,
  // when this listening run began, and recent session ends (loop guard).
  const wantListeningRef = useRef(false);
  const startedAtRef = useRef(0);
  const recentEndsRef = useRef<number[]>([]);
  const capTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCapTimer = () => {
    if (capTimerRef.current) clearTimeout(capTimerRef.current);
    capTimerRef.current = null;
  };

  const startSession = () => {
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: keepListening,
      // Only a hint — plenty of recognisers ignore it, which is why 'end'
      // below restarts the session instead of relying on this.
      androidIntentOptions: keepListening
        ? {
            EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
            EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
          }
        : undefined,
    });
  };

  useSpeechRecognitionEvent('start', () => {
    if (!isActiveRef.current) return;
    setIsListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    if (!isActiveRef.current) return;
    const now = Date.now();
    recentEndsRef.current = [...recentEndsRef.current.slice(-5), now];
    if (
      keepListening &&
      shouldResumeListening({
        wantListening: wantListeningRef.current,
        startedAt: startedAtRef.current,
        now,
        recentEnds: recentEndsRef.current.slice(0, -1),
      })
    ) {
      // The recogniser stopped on its own (a pause). Carry on without
      // flickering the UI out of its listening state.
      try {
        startSession();
        return;
      } catch {
        // fall through to a normal stop
      }
    }
    wantListeningRef.current = false;
    clearCapTimer();
    setIsListening(false);
    setTranscript('');
    isActiveRef.current = false;
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (!isActiveRef.current) return;
    const text = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      // With keepListening the caller has already appended this phrase to
      // what it shows, so the live line goes back to empty for the next one.
      setTranscript(keepListening ? '' : text);
      onFinalResult(text);
    } else {
      setTranscript(text);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (!isActiveRef.current) return;
    // Silence isn't a failure when we're keeping the mic open — 'end'
    // always follows an error and decides whether to resume.
    if (keepListening && wantListeningRef.current && isPauseError(event.error)) return;
    wantListeningRef.current = false;
    if (event.error === 'aborted' || isPauseError(event.error)) return;
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
      wantListeningRef.current = true;
      startedAtRef.current = Date.now();
      recentEndsRef.current = [];
      clearCapTimer();
      if (keepListening) {
        capTimerRef.current = setTimeout(() => {
          wantListeningRef.current = false;
          try {
            ExpoSpeechRecognitionModule.stop();
          } catch {
            // already stopped
          }
        }, MAX_LISTEN_MS);
      }
      startSession();
    } catch {
      isActiveRef.current = false;
      wantListeningRef.current = false;
      setError('Voice input is not available here — try typing instead.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keepListening]);

  const stop = useCallback(() => {
    // Deliberately does NOT clear isActiveRef here — a manual stop still
    // needs to receive the final 'result' event that follows, which only
    // this active instance should process. `isActiveRef` clears itself on
    // the subsequent 'end' event instead.
    wantListeningRef.current = false;
    clearCapTimer();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // no-op — already stopped or unsupported
    }
  }, []);

  return { isListening, transcript, error, start, stop };
}
