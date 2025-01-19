import React, { useEffect, useState, useRef } from 'react';
import { useMessageStore } from '../store/message/store';
import { useChannelStore } from '../store/channel/store';
import { useAuth } from '../store/authStore';
import { useUnreadStore } from '../store/unread/store';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useScrollBehavior } from '../hooks/useScrollBehavior';
import { Message } from './Message';
import { Box, Center, Spinner, Text } from '@chakra-ui/react';
import { WebSocketMessage, WebSocketMessageType, MessageReceivedPayload, ReactionPayload } from '../types/websocket.types';

interface TypingUser {
  userId: string;
  username: string;
}

export const MessageList: React.FC = () => {
  const { currentChannel } = useChannelStore();
  const { user } = useAuth();
  const { socket } = useWebSocket();
  const { markChannelAsRead } = useUnreadStore();
  const {
    fetchMessages,
    getChannelMessages,
    isLoading: storeLoading,
    error,
    addMessage,
    updateMessageReactions
  } = useMessageStore();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const messages = currentChannel ? getChannelMessages(currentChannel._id) : [];
  const messagesRef = useRef(messages);
  const { messagesEndRef, handleScroll } = useScrollBehavior(messages);
  const isLoading = localLoading || storeLoading;

  // Update messages ref when messages change
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Effect for handling message loading
  useEffect(() => {
    if (!currentChannel?._id) return;

    const channelId = currentChannel._id;
    const existingMessages = getChannelMessages(channelId);

    // Don't show loading if we already have messages
    if (existingMessages?.length) {
      console.log('MessageList: Using existing messages:', {
        channelId,
        messageCount: existingMessages.length,
        timestamp: new Date().toISOString()
      });
      markChannelAsRead(channelId);
      return;
    }

    setLocalLoading(true);
    console.log('MessageList: Loading messages:', {
      channelId,
      timestamp: new Date().toISOString()
    });

    fetchMessages(channelId)
      .then(() => {
        console.log('MessageList: Messages loaded:', {
          channelId,
          timestamp: new Date().toISOString()
        });
        markChannelAsRead(channelId);
      })
      .catch(error => {
        console.error('Failed to load messages:', error);
      })
      .finally(() => {
        setLocalLoading(false);
      });
  }, [currentChannel?._id]);

  // Log message updates separately
  useEffect(() => {
    if (currentChannel?._id && messages.length > 0) {
      console.log('MessageList: Messages Updated:', {
        channelId: currentChannel._id,
        messageCount: messages.length,
        timestamp: new Date().toISOString()
      });
    }
  }, [messages.length, currentChannel?._id]);

  // Handle socket messages
  useEffect(() => {
    if (!socket || !currentChannel) return;

    const handleMessage = (data: WebSocketMessage) => {
      try {
        const channelId = currentChannel._id;

        switch (data.type) {
          case WebSocketMessageType.MESSAGE_RECEIVED:
            const messagePayload = data.payload as MessageReceivedPayload;
            // Get channel ID from any available source
            const messageChannelId = messagePayload.channelId || messagePayload.message?.channel?._id;

            if (messageChannelId === channelId) {
              console.log('MessageList: Received new message:', {
                channelId,
                messageId: messagePayload.message._id,
                senderId: messagePayload.message.sender?._id,
                currentUserId: user?._id
              });

              // Ensure message has proper channel format
              const messageWithChannel = {
                ...messagePayload.message,
                channel: { _id: channelId }
              };

              addMessage(messageWithChannel);

              // Only mark as read if we're in the channel and it's not our message
              if (messagePayload.message.sender?._id !== user?._id) {
                markChannelAsRead(channelId);
              }
            }
            break;

          case WebSocketMessageType.REACTION_ADDED:
          case WebSocketMessageType.REACTION_REMOVED:
            const reactionPayload = data.payload as ReactionPayload;
            if (reactionPayload.channelId === channelId) {
              // Get current message reactions
              const message = messagesRef.current.find(m => m._id === reactionPayload.messageId);
              if (message) {
                const currentReactions = message.reactions || [];
                let updatedReactions;

                if (data.type === WebSocketMessageType.REACTION_ADDED) {
                  // Add the reaction
                  const existingReaction = currentReactions.find(r => r.emoji === reactionPayload.emoji);
                  if (existingReaction) {
                    // Add user to existing reaction if not already present
                    if (!existingReaction.users.includes(reactionPayload.userId)) {
                      updatedReactions = currentReactions.map(r =>
                        r.emoji === reactionPayload.emoji
                          ? { ...r, users: [...r.users, reactionPayload.userId] }
                          : r
                      );
                    }
                  } else {
                    // Create new reaction
                    updatedReactions = [...currentReactions, { emoji: reactionPayload.emoji, users: [reactionPayload.userId] }];
                  }
                } else {
                  // Remove the reaction
                  updatedReactions = currentReactions.map(r =>
                    r.emoji === reactionPayload.emoji
                      ? { ...r, users: r.users.filter(id => id !== reactionPayload.userId) }
                      : r
                  ).filter(r => r.users.length > 0);
                }

                if (updatedReactions) {
                  updateMessageReactions(reactionPayload.messageId, channelId, updatedReactions);
                }
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error handling socket message:', error);
      }
    };

    // Use updateMessageHandler instead of trying to use onMessage
    socket.updateMessageHandler(handleMessage);

    return () => {
      socket.updateMessageHandler(undefined);
    };
  }, [socket, currentChannel, user?._id, addMessage, markChannelAsRead, updateMessageReactions]);

  if (!currentChannel) {
    return (
      <Center h="full">
        <Text color="gray.500">Select a channel to start messaging</Text>
      </Center>
    );
  }

  // Only show loading spinner if we have no messages
  if (isLoading && !messages.length) {
    return (
      <Center h="full">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center h="full">
        <Text color="red.500">{error}</Text>
      </Center>
    );
  }

  return (
    <Box
      flex="1"
      overflowY="auto"
      display="flex"
      flexDirection="column"
      p={4}
      gap={2}
      h="full"
      onScroll={handleScroll}
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
      {typingUsers.length > 0 && (
        <Text
          fontSize="sm"
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
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};
