import React from 'react';
import { Box, Tooltip } from '@chakra-ui/react';
import { usePresenceStore } from '../store/presenceStore';

interface UserStatusProps {
  userId: string;
  showTooltip?: boolean;
}

export const UserStatus: React.FC<UserStatusProps> = ({ userId, showTooltip = true }) => {
  const { userPresence } = usePresenceStore();
  const presenceInfo = userPresence[userId];
  const status = presenceInfo?.status || 'offline';

  const statusColor = status === 'online' ? 'green.500' : 'gray.400';

  const statusDot = (
    <Box
      w="8px"
      h="8px"
      borderRadius="full"
      bg={statusColor}
      display="inline-block"
      mr={2}
      transition="background-color 0.2s"
    />
  );

  if (showTooltip) {
    return (
      <Tooltip label={`${status.charAt(0).toUpperCase() + status.slice(1)}`}>
        {statusDot}
      </Tooltip>
    );
  }

  return statusDot;
};
