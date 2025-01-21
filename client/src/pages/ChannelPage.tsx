import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useChannelStore } from '../store/channel/store';
import { useMessageStore } from '../store/message/store';
import { WebSocketMessageType } from '../types/websocket.types';
import Logger from '../utils/logger';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import { Box, Grid, GridItem, VStack, Spinner, Center, Text } from '@chakra-ui/react';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { OnlineUsersList } from '../components/OnlineUsersList';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { initializeSocketHandlers } from '../store/socketHandlers';

const logState = (prefix: string, data: any) => {
  Logger.debug(prefix, {
    context: 'ChannelPage',
    data: {
      ...data,
      timestamp: performance.now().toFixed(2)
    }
  });
};

export const ChannelPage: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { socket, isConnected, isConnecting, lastError, sendMessage, isReady } = useWebSocket();
  const {
    channels,
    currentChannel,
    setCurrentChannel,
    setFocusedChannel,
    fetchChannels,
  } = useChannelStore();
  const { setCurrentChannelId } = useMessageStore();
  const [isLoading, setIsLoading] = useState(true);
  const mountTime = useRef(performance.now());
  const handlersRef = useRef<{ cleanup: () => void } | null>(null);

  useEffect(() => {
    const mountTime = performance.now();

    Logger.debug('ChannelPage Mounted', {
      context: 'ChannelPage',
      data: {
        mountTime,
        channelId,
        isConnected,
        hasUser: !!user,
        channelsCount: channels.length,
        currentChannel: currentChannel?._id
      }
    });

    if (!isConnected || !socket || !user) {
      Logger.warn('Channel initialization delayed', {
        context: 'ChannelPage',
        data: {
          isConnected,
          hasUser: !!user,
          userId: user?._id,
          wsState: {
            connected: isConnected,
            connecting: isConnecting,
            hasError: !!lastError,
            error: lastError?.message
          }
        }
      });
      return;
    }

    // Note: CLIENT_READY is now handled by WebSocketContext
    Logger.debug('ChannelPage ready for initialization', {
      context: 'ChannelPage',
      data: {
        userId: user._id,
        username: user.username,
        wsState: {
          connected: isConnected,
          readyState: socket ? WebSocket.OPEN : undefined
        }
      }
    });
  }, [isConnected, socket, user, lastError]);

  // Join channel when connected and ready
  useEffect(() => {
    if (isConnected && isReady && channelId) {
      Logger.debug('Joining channel', {
        context: 'ChannelPage',
        data: {
          channelId,
          isConnected,
          isReady
        }
      });
      sendMessage(WebSocketMessageType.CHANNEL_JOIN, { channelId });
    }
  }, [channelId, isConnected, isReady, sendMessage]);

  // Initialize socket handlers and fetch initial data
  useEffect(() => {
    if (!socket || !user || !isConnected) return;

    const startTime = performance.now();
    logState('Starting Channel Init', {
      channelId,
      currentChannelId: currentChannel?._id,
      isConnected,
      userId: user?._id,
      startTime: Math.round(startTime - mountTime.current)
    });

    // Initialize socket handlers
    handlersRef.current = initializeSocketHandlers(socket, {
      onInitialized: () => {
        setIsLoading(false);
        logState('Channel Init Complete', {
          channelsCount: channels.length,
          hasDMs: channels.some(c => c.isDM),
          isConnected,
          totalTime: Math.round(performance.now() - startTime),
        });
      }
    });

    // Set loading to false if channels are already loaded
    if (channels.length > 0) {
      setIsLoading(false);
    }

    // Fetch initial channels if needed
    if (channels.length === 0) {
      fetchChannels().catch(error => {
        console.error('Failed to fetch channels:', error);
        setIsLoading(false);
      });
    }
  }, [socket, user, isConnected, channels.length]);

  // Handle channel routing
  useEffect(() => {
    if (!isConnected || !user || channels.length === 0 || isLoading) {
      return;
    }

    // If no channelId is provided, redirect to the first available channel
    if (!channelId && channels.length > 0) {
      const firstChannel = channels[0];
      navigate(`/channels/${firstChannel._id}`);
      return;
    }

    // Find the requested channel
    const targetChannel = channels.find(ch => ch._id === channelId);
    if (!targetChannel) {
      logState('Invalid Channel', {
        requestedId: channelId,
        availableChannels: channels.map(ch => ch._id)
      });
      // Redirect to first channel if current one is invalid
      if (channels.length > 0) {
        navigate(`/channels/${channels[0]._id}`);
      }
      return;
    }

    // Update current channel
    setCurrentChannel(targetChannel);
    setFocusedChannel(targetChannel._id);
    setCurrentChannelId(targetChannel._id);

    // Join the channel
    sendMessage(WebSocketMessageType.CHANNEL_JOIN, {
      channelId: targetChannel._id
    });

    logState('Channel Routing Complete', {
      channelId: targetChannel._id,
      channelName: targetChannel.name,
      isConnected
    });
  }, [channelId, isConnected, user, channels, isLoading]);

  if (isLoading) {
    return (
      <Center h="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading channels...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Grid
      templateColumns="250px 1fr 200px"
      h="100vh"
      gap={0}
    >
      {/* Left sidebar */}
      <GridItem>
        <Sidebar />
      </GridItem>

      {/* Main content */}
      <GridItem
        display="flex"
        flexDirection="column"
        overflow="hidden"
      >
        <Box flex="1" overflow="auto">
          <MessageList />
        </Box>
        <Box>
          <MessageInput />
        </Box>
      </GridItem>

      {/* Right sidebar */}
      <GridItem>
        <VStack
          align="stretch"
          p={4}
          borderLeft="1px"
          borderColor="gray.200"
          spacing={4}
          overflowY="auto"
          bg="gray.100"
          h="100%"
        >
          <OnlineUsersList />
          <ConnectionStatus />
        </VStack>
      </GridItem>
    </Grid>
  );
};
