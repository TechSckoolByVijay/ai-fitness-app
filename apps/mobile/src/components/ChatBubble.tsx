import type { AiMessageDto } from '@fitness-app/shared';
import { View } from 'react-native';
import { Text } from './ui/Text';

interface ChatBubbleProps {
  message: AiMessageDto;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  return (
    <View className={`flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser ? 'bg-primary-500' : 'bg-muted-light dark:bg-muted-dark'
        }`}
      >
        <Text
          variant="body"
          className={isUser ? 'text-white' : 'text-gray-900 dark:text-gray-50'}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}
