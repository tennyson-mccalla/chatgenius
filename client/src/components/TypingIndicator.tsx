import { Text } from '@chakra-ui/react';
import { useTypingStore } from '../store/typing/store';

interface TypingIndicatorProps {
  channelId: string;
}

export const TypingIndicator = ({ channelId }: TypingIndicatorProps) => {
  const typingUsers = useTypingStore((state) => state.typingUsers[channelId] || []);

  if (typingUsers.length === 0) return null;

  return (
    <Text
      fontSize="md"
      color="blue.500"
      bg="gray.100"
      p={2}
      borderRadius="md"
      position="sticky"
      bottom={0}
      width="fit-content"
    >
      {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
    </Text>
  );
};
