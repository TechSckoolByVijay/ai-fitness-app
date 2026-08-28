import type { AiMessageDto, CoachReaction } from '@fitness-app/shared';
import { Fragment } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './ui/Text';

interface ChatBubbleProps {
  message: AiMessageDto;
  /** When provided, assistant bubbles show 👍/👎 — the taste-feedback loop that personalizes future suggestions. Tapping the active one clears it. */
  onReact?: (messageId: string, reaction: CoachReaction | null) => void;
}

/** The Coach's replies sometimes contain **bold** markdown (from the LLM) — render it as bold inline text rather than showing the literal asterisks. No other markdown is supported, on purpose — this is just enough to stop the visual noise. */
function renderContent(content: string, colorClassName: string) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    const match = part.match(/^\*\*([^*]+)\*\*$/);
    if (!match) return <Fragment key={index}>{part}</Fragment>;
    return (
      <Text key={index} variant="body" className={`font-bold ${colorClassName}`}>
        {match[1]}
      </Text>
    );
  });
}

export function ChatBubble({ message, onReact }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const colorClassName = isUser ? 'text-white' : 'text-gray-900 dark:text-gray-50';
  const showReactions = !isUser && onReact;
  return (
    <View className={`${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[85%] px-4 py-3 ${
          isUser
            ? 'rounded-3xl rounded-br-lg bg-primary-500'
            : 'rounded-3xl rounded-bl-lg bg-white shadow-sm shadow-black/5 dark:bg-muted-dark'
        }`}
      >
        <Text variant="body" className={colorClassName}>
          {renderContent(message.content, colorClassName)}
        </Text>
      </View>
      {showReactions ? (
        <View className="mt-1 flex-row gap-1.5 pl-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Good suggestion — more like this"
            onPress={() => onReact(message.id, message.reaction === 'liked' ? null : 'liked')}
            className={`h-9 w-9 items-center justify-center rounded-full ${
              message.reaction === 'liked' ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-muted-light dark:bg-muted-dark'
            }`}
          >
            <Text className={`text-[15px] ${message.reaction === 'liked' ? '' : 'opacity-50'}`}>👍</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Not for me — suggest differently"
            onPress={() => onReact(message.id, message.reaction === 'disliked' ? null : 'disliked')}
            className={`h-9 w-9 items-center justify-center rounded-full ${
              message.reaction === 'disliked' ? 'bg-red-100 dark:bg-red-900/40' : 'bg-muted-light dark:bg-muted-dark'
            }`}
          >
            <Text className={`text-[15px] ${message.reaction === 'disliked' ? '' : 'opacity-50'}`}>👎</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
