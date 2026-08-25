export interface TranscriptionResult {
  text: string;
  confidence: number;
}

export interface SpeechProvider {
  transcribe(input: { audioBase64?: string; mockTranscriptId?: string }): Promise<TranscriptionResult>;
}
