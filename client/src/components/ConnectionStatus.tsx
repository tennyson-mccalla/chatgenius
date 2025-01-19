import React, { useEffect, useRef } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useToast, Box, Text, Spinner } from '@chakra-ui/react';
import { WebSocketConnectionState } from '../types/websocket.types';

export const ConnectionStatus: React.FC = () => {
  const { isConnected, connectionState, reconnectAttempt } = useWebSocket();
  const toast = useToast();
  const wasConnected = useRef(false);

  // Clear any existing toasts on mount
  useEffect(() => {
    toast.closeAll();
  }, []);

  // Track connection state changes
  useEffect(() => {
    if (isConnected) {
      wasConnected.current = true;
    }

    // Show disconnection toast only if we were previously connected
    if (wasConnected.current && !isConnected) {
      toast({
        title: 'Connection Lost',
        description: 'Attempting to reconnect...',
        status: 'warning',
        duration: null,
        isClosable: true,
        position: 'bottom-right',
        id: 'connection-toast'
      });
    } else if (isConnected && wasConnected.current) {
      toast.close('connection-toast');
      toast({
        title: 'Connected',
        description: 'Chat connection restored',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'bottom-right'
      });
    }
  }, [isConnected, connectionState, toast]);

  // Only show the status indicator when disconnected after being connected
  if (!wasConnected.current || isConnected || connectionState === WebSocketConnectionState.CONNECTING) {
    return null;
  }

  return (
    <Box
      position="fixed"
      bottom="4"
      right="4"
      bg="red.50"
      p={3}
      borderRadius="md"
      boxShadow="sm"
      display="flex"
      alignItems="center"
      gap={2}
      zIndex={1000}
    >
      <Spinner size="sm" color="red.500" />
      <Text color="red.700" fontSize="sm">
        {connectionState === WebSocketConnectionState.RECONNECTING
          ? `Reconnecting (Attempt ${reconnectAttempt})...`
          : 'Connection lost. Attempting to reconnect...'}
      </Text>
    </Box>
  );
};
