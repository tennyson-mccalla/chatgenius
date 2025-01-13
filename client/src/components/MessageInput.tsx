import React, { useState, useRef, useCallback } from 'react';
import { Box, Input, IconButton, useToast } from '@chakra-ui/react';
import { IoSend } from 'react-icons/io5';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { useChannelStore } from '../store/channelStore';

interface MessageInputProps {
  parentMessageId?: string;
  onMessageSent?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ parentMessageId, onMessageSent }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { channelId } = useParams<{ channelId: string }>();
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const { currentChannel } = useChannelStore();
  const toast = useToast();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || !currentChannel?._id || !user) return;

    try {
      setIsLoading(true);

      const messageData = {
        content: content.trim(),
        channelId: currentChannel._id,
        ...(parentMessageId && { parentMessageId })
      };

      console.log('Emitting new_message event with message:', messageData);
      socket?.emit('new_message', messageData);

      // Clear input and notify parent
      setContent('');
      onMessageSent?.();

      // Focus the input after sending
      inputRef.current?.focus();
    } catch (error) {
      toast({
        title: 'Error sending message',
        description: 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [content, currentChannel?._id, user, parentMessageId, socket, onMessageSent, toast]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }, [handleSubmit]);

  return (
    <Box as="form" onSubmit={handleSubmit} p={4} borderTop="1px" borderColor="gray.200">
      <Box display="flex" alignItems="center" gap={2}>
        <Input
          ref={inputRef}
          placeholder="Type a message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          autoComplete="off"
          _focus={{
            borderColor: 'blue.500',
            boxShadow: 'none'
          }}
        />
        <IconButton
          aria-label="Send message"
          icon={<IoSend />}
          type="submit"
          isLoading={isLoading}
          colorScheme="blue"
          variant="ghost"
          isDisabled={!content.trim()}
        />
      </Box>
    </Box>
  );
};
