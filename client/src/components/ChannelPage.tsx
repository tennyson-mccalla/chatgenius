import React, { useEffect, useRef } from 'react';
import { Grid, VStack } from '@chakra-ui/react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChannelList } from './ChannelList';
import { DMList } from './DMList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { OnlineUsersList } from './OnlineUsersList';
import { useChannelStore } from '../store/channel/store';
import { useAuth } from '../store/authStore';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useUnreadStore } from '../store/unread/store';
import { WebSocketMessageType } from '../types/websocket.types';

export const ChannelPage: React.FC = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { socket, isConnected, sendMessage } = useWebSocket();
  const { user } = useAuth();
  const { channels, fetchChannels, fetchDMChannels, setCurrentChannel, currentChannel } = useChannelStore();
  const initialized = useRef(false);

  // Initialize socket handlers and fetch data
  useEffect(() => {
    if (!socket || !user || initialized.current) return;

    // Initialize unread socket handlers
    const cleanup = useUnreadStore.getState().initializeUnreadSocket(socket);

    // Fetch initial data
    const initializeData = async () => {
      try {
        await Promise.all([
          fetchChannels(),
          fetchDMChannels(),
          useUnreadStore.getState().fetchUnreadCounts()
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    initializeData();
    initialized.current = true;

    return () => {
      if (cleanup) cleanup();
      useUnreadStore.getState().cleanup();
      initialized.current = false;
    };
  }, [socket, user, fetchChannels, fetchDMChannels]);

  // Handle missing channelId or invalid URL
  useEffect(() => {
    if (!channels.length) return;

    // If we're at /channels with no ID, redirect to first channel
    if (location.pathname === '/channels' || !channelId) {
      const firstChannel = channels[0];
      if (firstChannel) {
        navigate(`/channels/${firstChannel._id}`, { replace: true });
      }
      return;
    }

    // Find and set the current channel
    const channel = channels.find(ch => ch._id === channelId);
    if (channel && (!currentChannel || currentChannel._id !== channelId)) {
      setCurrentChannel(channel);
    } else if (!channel) {
      const firstChannel = channels[0];
      if (firstChannel) {
        navigate(`/channels/${firstChannel._id}`, { replace: true });
      }
    }
  }, [channels, channelId, currentChannel, setCurrentChannel, navigate, location]);

  // Join channel when connected
  useEffect(() => {
    if (isConnected && channelId) {
      sendMessage(WebSocketMessageType.CHANNEL_JOIN, { channelId });
    }
  }, [channelId, isConnected, sendMessage]);

  return (
    <Grid
      templateColumns="250px 1fr 200px"
      h="100vh"
      gap={0}
    >
      {/* Left sidebar */}
      <VStack
        align="stretch"
        p={4}
        borderRight="1px"
        borderColor="gray.200"
        spacing={6}
        overflowY="auto"
      >
        <ChannelList />
        <DMList />
      </VStack>

      {/* Main content */}
      <VStack
        align="stretch"
        spacing={0}
        h="100vh"
      >
        <MessageList />
        <MessageInput />
      </VStack>

      {/* Right sidebar */}
      <VStack
        align="stretch"
        p={4}
        borderLeft="1px"
        borderColor="gray.200"
        spacing={4}
        overflowY="auto"
      >
        <OnlineUsersList />
      </VStack>
    </Grid>
  );
};
