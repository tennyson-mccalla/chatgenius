import React, { useEffect, useState } from 'react';
import { Box, Flex, Text, useToast, Center, VStack, Icon, Spinner } from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaComments } from 'react-icons/fa';
import { ChannelList } from '../components/ChannelList';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { useAuthStore } from '../store/authStore';
import { useChannelStore } from '../store/channelStore';
import { useSocket } from '../hooks/useSocket';

interface Channel {
  _id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  isDM: boolean;
  members: string[];
  createdBy: string;
}

export const ChannelPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { channelId } = useParams<{ channelId: string }>();
  const { user } = useAuthStore();
  const { channels, fetchChannels, getChannelByNameOrId, setCurrentChannel } = useChannelStore();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const toast = useToast();

  // Fetch channels if not already loaded
  useEffect(() => {
    const loadChannels = async () => {
      console.log('Loading channels...', {
        currentChannels: channels.length,
        isLoading
      });

      try {
        if (channels.length === 0) {
          await fetchChannels();
        }
      } catch (error) {
        console.error('Error loading channels:', error);
        toast({
          title: 'Error loading channels',
          description: 'Please try refreshing the page',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
        console.log('Finished loading channels', {
          channelsLoaded: channels.length,
          isLoading: false
        });
      }
    };
    loadChannels();
  }, [channels.length, fetchChannels, toast]);

  // Handle channel navigation
  useEffect(() => {
    if (!isLoading && channelId) {
      // Try to find the channel by name or ID
      const channel = getChannelByNameOrId(channelId);
      if (channel) {
        setCurrentChannel(channel);
      } else {
        console.error('Channel not found:', channelId);
        toast({
          title: 'Channel not found',
          description: 'Redirecting to home',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        navigate('/channels');
      }
    }
  }, [channelId, channels, isLoading, navigate, toast, getChannelByNameOrId, setCurrentChannel]);

  // Show loading state while channels are loading
  if (isLoading) {
    console.log('Rendering loading state', { isLoading, channelsCount: channels.length });
    return (
      <Flex h="100vh">
        <Box w="250px" borderRight="1px" borderColor="gray.200" bg="gray.50">
          <ChannelList />
        </Box>
        <Center flex="1">
          <VStack spacing={4}>
            <Spinner size="xl" />
            <Text color="gray.500">Loading channels...</Text>
          </VStack>
        </Center>
      </Flex>
    );
  }

  console.log('Rendering main UI', {
    channelId,
    channelsCount: channels.length,
    currentChannel: channelId ? getChannelByNameOrId(channelId) : null
  });

  const currentChannel = channelId ? getChannelByNameOrId(channelId) : null;

  return (
    <Flex h="100vh">
      <Box w="250px" borderRight="1px" borderColor="gray.200" bg="gray.50">
        <ChannelList />
      </Box>

      {currentChannel ? (
        <Flex flex="1" direction="column">
          <Box p={4} borderBottom="1px" borderColor="gray.200">
            <Text fontSize="xl" fontWeight="bold">#{currentChannel.name}</Text>
            {currentChannel.description && (
              <Text color="gray.600">{currentChannel.description}</Text>
            )}
          </Box>
          <MessageList />
          <MessageInput />
        </Flex>
      ) : (
        <Center flex="1">
          <VStack spacing={4}>
            <Icon as={FaComments} boxSize={12} color="gray.400" />
            <Text fontSize="xl" color="gray.600">
              Welcome to ChatGenius, {user?.username}!
            </Text>
            <Text color="gray.500">
              Select a channel from the sidebar to start chatting
            </Text>
          </VStack>
        </Center>
      )}
    </Flex>
  );
};
