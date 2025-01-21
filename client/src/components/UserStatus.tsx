import React from 'react';
import { Box, Tooltip } from '@chakra-ui/react';
import { usePresenceStore } from '../store/presence/store';
import { UserStatus as UserStatusEnum } from '../types/user.types';

interface UserStatusProps {
  userId: string;
  showTooltip?: boolean;
}

export const UserStatus: React.FC<UserStatusProps> = ({ userId, showTooltip = true }) => {
  const { userStatuses } = usePresenceStore();
  const userStatus = userStatuses[userId];
  const status = userStatus?.status || UserStatusEnum.OFFLINE;

  const statusColor = status === UserStatusEnum.ONLINE ? 'green.500' : 'gray.400';
  const statusText = status === UserStatusEnum.ONLINE ? 'Online' : 'Offline';

  const statusDot = (
    <Box
      w="10px"
      h="10px"
      borderRadius="full"
      bg={statusColor}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      mr={3}
      transition="background-color 0.2s"
      flexShrink={0}
    />
  );

  if (showTooltip) {
    return (
      <Tooltip label={statusText}>
        {statusDot}
      </Tooltip>
    );
  }

  return statusDot;
};
