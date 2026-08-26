import type { AiMessageDto } from '@fitness-app/shared';
import { Fragment } from 'react';
import { View } from 'react-native';
import { Text } from './ui/Text';

interface ChatBubbleProps {
  message: AiMessageDto;
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

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const colorClassName = isUser ? 'text-white' : 'text-gray-900 dark:text-gray-50';
  return (
    <View className={`flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser ? 'bg-primary-500' : 'bg-muted-light dark:bg-muted-dark'
        }`}
      >
        <Text variant="body" className={colorClassName}>
          {renderContent(message.content, colorClassName)}
        </Text>
      </View>
    </View>
  );
}
