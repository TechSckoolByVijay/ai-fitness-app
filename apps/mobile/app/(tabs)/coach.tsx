import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
  type FlatList as FlatListType,
} from 'react-native';
import type { AiMessageDto } from '@fitness-app/shared';
import { ApiError } from '../../src/api/client';
import { ChatBubble } from '../../src/components/ChatBubble';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Text } from '../../src/components/ui/Text';
import { TextField } from '../../src/components/ui/TextField';
import { useCoachConversation, useSendCoachMessage } from '../../src/hooks/useCoach';

const STARTER_PROMPTS = [
  'Suggest a snack for me right now',
  "What's my calorie budget left today?",
  'I want a high-protein dinner idea',
];

export default function CoachScreen() {
  const conversation = useCoachConversation();
  const sendMessage = useSendCoachMessage();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatListType<AiMessageDto>>(null);

  const messages = conversation.data?.conversation?.messages ?? [];

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending) return;

    setError(null);
    setDraft('');
    try {
      await sendMessage.mutateAsync(trimmed);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setDraft(trimmed);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white dark:bg-surface-dark"
    >
      {conversation.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22b56d" />
        </View>
      ) : messages.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <EmptyState
            emoji="🤖"
            title="Ask me for a meal idea"
            subtitle="Tell me what you're in the mood for and I'll suggest something that fits your budget and preferences."
          />
          <View className="w-full gap-2">
            {STARTER_PROMPTS.map((prompt) => (
              <Chip key={prompt} label={prompt} selected={false} onPress={() => submit(prompt)} />
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 p-5"
          renderItem={({ item }) => <ChatBubble message={item} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {error ? (
        <Text variant="caption" className="px-5 text-red-500">
          {error}
        </Text>
      ) : null}

      <View className="flex-row items-end gap-2 border-t border-gray-100 p-3 dark:border-gray-800">
        <TextField
          label=""
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask for a suggestion..."
          multiline
          className="flex-1"
        />
        <Button
          label="Send"
          onPress={() => submit(draft)}
          loading={sendMessage.isPending}
          disabled={!draft.trim()}
          className="px-4"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
