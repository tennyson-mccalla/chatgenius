import React, { useEffect, useRef } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useToast } from '@chakra-ui/react';

export const ConnectionStatus: React.FC = () => {
  const { isConnected, lastError } = useWebSocket();
  const toast = useToast();
  const wasConnected = useRef(false);
  const toastIdRef = useRef<string | null>(null);

  // Clear any existing toasts on mount
  useEffect(() => {
    return () => {
      // Cleanup toasts on unmount
      if (toastIdRef.current) {
        toast.close(toastIdRef.current);
      }
    };
  }, []);

  // Track connection state changes
  useEffect(() => {
    if (isConnected) {
      wasConnected.current = true;
    }

    // Close any existing toast
    if (toastIdRef.current) {
      toast.close(toastIdRef.current);
      toastIdRef.current = null;
    }

    // Show disconnection toast only if we were previously connected
    if (wasConnected.current && !isConnected) {
      toastIdRef.current = `connection-warning-${Date.now()}`;
      toast({
        title: 'Connection Lost',
        description: 'Attempting to reconnect...',
        status: 'warning',
        duration: null,
        isClosable: true,
        position: 'bottom',
        id: toastIdRef.current
      });
    } else if (isConnected && wasConnected.current) {
      toastIdRef.current = `connection-success-${Date.now()}`;
      toast({
        title: 'Connected',
        description: 'Successfully connected to chat server',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'bottom',
        id: toastIdRef.current
      });
    } else if (lastError) {
      toastIdRef.current = `connection-error-${Date.now()}`;
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to chat server',
        status: 'error',
        duration: null,
        isClosable: true,
        position: 'bottom',
        id: toastIdRef.current
      });
    }
  }, [isConnected, lastError, toast]);

  return null;
};
