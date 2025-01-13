import React from 'react';
import { Box, Text, Spinner } from '@chakra-ui/react';
import { useSocket } from '../hooks/useSocket';
import { useAuthStore } from '../store/authStore';

export const ConnectionStatus: React.FC = () => {
  const { socket } = useSocket();
  const { isAuthenticated } = useAuthStore();

  // Only show connection status if authenticated and socket is not connected
  if (!isAuthenticated || socket?.connected) {
    return null;
  }

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      p={2}
      bg="blue.500"
      color="white"
      textAlign="center"
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={2}
      zIndex={9999}
    >
      <Spinner size="sm" color="white" />
      <Text fontSize="sm" fontWeight="medium">
        Connecting to server...
      </Text>
    </Box>
  );
};
