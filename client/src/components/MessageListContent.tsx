import React, { memo } from 'react';
import { VStack, Text, Center, Spinner } from '@chakra-ui/react';
import { Message } from './Message';
import { Channel } from '../store/channel/types';

interface TypingUser {
  userId: string;
  username: string;
}

interface MessageListContentProps {
  messages: Array<{
    _id: string;
    content: string;
    sender: {
      _id: string;
      username: string;
      avatar?: string;
    };
    createdAt: string;
    reactions?: Array<{
      emoji: string;
      users: string[];
    }>;
  }>;
  isLoading: boolean;
  error: string | null;
  typingUsers: TypingUser[];
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  hasChannel: boolean;
}

// Memoized loading state component
const LoadingState = memo(() => (
  <Center h="full">
    <Spinner size="lg" color="blue.500" />
  </Center>
));

// Memoized error state component
const ErrorState = memo(({ error }: { error: string }) => (
  <Center h="full">
    <Text color="red.500">{error}</Text>
  </Center>
));

// Memoized empty state component
const EmptyState = memo(() => (
  <Center h="full">
    <Text color="gray.500">Select a channel to start messaging</Text>
  </Center>
));

// Memoized typing indicator component
const TypingIndicator = memo(({ users }: { users: TypingUser[] }) => (
  users.length > 0 ? (
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
      {users.map(u => u.username).join(', ')} {users.length === 1 ? 'is' : 'are'} typing...
    </Text>
  ) : null
));

export const MessageListContent = memo<MessageListContentProps>(({
  messages,
  isLoading,
  error,
  typingUsers,
  onScroll,
  messagesEndRef,
  hasChannel
}) => {
  if (!hasChannel) {
    return <EmptyState />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <VStack
      spacing={4}
      align="stretch"
      flex={1}
      overflowY="auto"
      maxH="calc(100vh - 180px)"
      h="calc(100vh - 180px)"
      p={4}
      onScroll={onScroll}
    >
      {messages.length === 0 ? (
        <Text color="gray.500" textAlign="center">No messages yet</Text>
      ) : (
        messages.map((message) => (
          <Message
            key={message._id}
            id={message._id}
            content={message.content}
            sender={message.sender}
            timestamp={message.createdAt}
            reactions={message.reactions || []}
          />
        ))
      )}
      <TypingIndicator users={typingUsers} />
      <div ref={messagesEndRef} />
    </VStack>
  );
});

MessageListContent.displayName = 'MessageListContent';
