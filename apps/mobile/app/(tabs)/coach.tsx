import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { ApiError } from '../../src/api/client';
import { ChatBubble } from '../../src/components/ChatBubble';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Text } from '../../src/components/ui/Text';
import { TextField } from '../../src/components/ui/TextField';
import { TopInsetSpacer } from '../../src/components/ui/TopInsetSpacer';
import { useClearCoachConversation, useCoachConversation, useSendCoachMessage } from '../../src/hooks/useCoach';
import { useVoiceRecognition } from '../../src/hooks/useVoiceRecognition';
import { getContextualCoachPrompts } from '../../src/utils/coachSuggestions';

export default function CoachScreen() {
  const conversation = useCoachConversation();
  const sendMessage = useSendCoachMessage();
  const clearConversation = useClearCoachConversation();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const confirmClearChat = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Clear all chat messages? This cannot be undone.')) clearConversation.mutate();
      return;
    }
    Alert.alert('Clear chat?', 'This removes all messages. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearConversation.mutate() },
    ]);
  };
  // Computed once per screen visit, not on every render — the suggestions
  // only need to be roughly right for "now", not update live to the minute.
  const suggestedPrompts = useMemo(() => getContextualCoachPrompts(), []);

  const messages = conversation.data?.conversation?.messages ?? [];

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending) return;

    setError(null);
    setDraft('');
    try {
      await sendMessage.mutateAsync(trimmed);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setDraft(trimmed);
    }
  };

  const voice = useVoiceRecognition((finalText) => {
    if (finalText.trim()) void submit(finalText);
  });

  const toggleVoice = () => {
    if (voice.isListening) {
      voice.stop();
    } else {
      void voice.start();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-surface-light dark:bg-surface-dark"
    >
      <TopInsetSpacer />
      <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
        <Text variant="title">Coach 🤖</Text>
        {messages.length > 0 ? (
          <Button label="Clear chat" variant="ghost" onPress={confirmClearChat} loading={clearConversation.isPending} />
        ) : null}
      </View>
      {conversation.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#12c06e" />
        </View>
      ) : messages.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <EmptyState
            emoji="🤖"
            title="Ask me for a meal idea"
            subtitle="Tell me what you're in the mood for and I'll suggest something that fits your budget and preferences."
          />
          <View className="w-full gap-2">
            {suggestedPrompts.map((prompt) => (
              <Chip key={prompt} label={prompt} selected={false} onPress={() => submit(prompt)} />
            ))}
          </View>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerClassName="gap-3 p-5"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
        </ScrollView>
      )}

      {messages.length > 0 ? (
        <View className="flex-row flex-wrap gap-2 px-5 pb-2">
          {suggestedPrompts.map((prompt) => (
            <Chip key={prompt} label={prompt} selected={false} onPress={() => submit(prompt)} />
          ))}
        </View>
      ) : null}

      {voice.isListening ? (
        <Text variant="caption" className="px-5 pb-1 italic">
          {voice.transcript ? `"${voice.transcript}"` : 'Listening...'}
        </Text>
      ) : null}

      {voice.error ? (
        <Text variant="caption" className="px-5 text-red-500">
          {voice.error}
        </Text>
      ) : null}

      {error ? (
        <Text variant="caption" className="px-5 text-red-500">
          {error}
        </Text>
      ) : null}

      <View className="flex-row items-end gap-2 border-t border-gray-100 p-3 dark:border-gray-800">
        <View className="flex-1">
          <TextField
            label=""
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask for a suggestion, or tap the mic..."
            multiline
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={voice.isListening ? 'Stop listening' : 'Speak your message'}
          onPress={toggleVoice}
          className={`h-[52px] w-[52px] items-center justify-center rounded-xl ${
            voice.isListening ? 'bg-red-100 dark:bg-red-900/40' : 'bg-muted-light dark:bg-muted-dark'
          }`}
        >
          <Text className="text-xl">{voice.isListening ? '🔴' : '🎙️'}</Text>
        </Pressable>
        <Button
          label="Send"
          onPress={() => submit(draft)}
          loading={sendMessage.isPending}
          disabled={!draft.trim()}
          className="px-4"
        />
      </View>
      <Text variant="caption" className="px-5 pb-3 text-center text-[11px] opacity-70">
        For general wellness guidance only — not medical advice. Talk to a healthcare provider about anything specific to your health.
      </Text>
    </KeyboardAvoidingView>
  );
}
