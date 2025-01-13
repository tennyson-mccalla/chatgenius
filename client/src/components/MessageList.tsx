import React, { useEffect, useRef, useState } from 'react';
import { Box, VStack, Text, Avatar, Flex } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useChannelStore } from '../store/channelStore';
import { UserStatus } from './UserStatus';
import api from '../services/api';

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  createdAt: string;
}

export const MessageList: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const { channelId } = useParams<{ channelId: string }>();
  const { socket } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentChannel } = useChannelStore();
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

  const scrollToBottom = () => {
    if (shouldScrollToBottom) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Handle scroll events to determine if we should auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
    setShouldScrollToBottom(isAtBottom);
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentChannel?._id) return;

      try {
        const response = await api.get(`/messages/channel/${currentChannel._id}`);
        setMessages(response.data);
        setShouldScrollToBottom(true);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [currentChannel?._id]);

  useEffect(() => {
    if (!socket || !currentChannel?._id) return;

    console.log('Setting up message listeners for channel:', currentChannel._id);

    const handleNewMessage = (message: Message) => {
      console.log('Received message:', message);
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        if (prev.some(m => m._id === message._id)) {
          return prev;
        }
        return [...prev, message];
      });
      scrollToBottom();
    };

    socket.on('message_received', handleNewMessage);

    // Join the channel room
    console.log('Joining channel:', currentChannel._id);
    socket.emit('join_channel', currentChannel._id);

    return () => {
      console.log('Cleaning up message listeners for channel:', currentChannel._id);
      socket.emit('leave_channel', currentChannel._id);
      socket.off('message_received', handleNewMessage);
    };
  }, [socket, currentChannel?._id]);

  return (
    <Box flex="1" overflowY="auto" p={4} onScroll={handleScroll}>
      <VStack spacing={4} align="stretch">
        {messages.map((message) => (
          <Box key={message._id}>
            <Flex align="center" mb={1}>
              <Avatar size="sm" name={message.sender.username} src={message.sender.avatar} mr={2} />
              <Box>
                <Flex align="center">
                  <Text fontWeight="bold" mr={2}>
                    {message.sender.username}
                  </Text>
                  <UserStatus userId={message.sender._id} />
                  <Text fontSize="xs" color="gray.500" ml={2}>
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </Text>
                </Flex>
                <Text>{message.content}</Text>
              </Box>
            </Flex>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </VStack>
    </Box>
  );
};
