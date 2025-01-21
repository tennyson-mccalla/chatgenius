import React, { useEffect } from 'react';
import { Box, VStack, Text, Avatar, Flex } from '@chakra-ui/react';
import { usePresenceStore } from '../store/presence/store';
import { useAuth } from '../store/authStore';
import { UserStatus as UserStatusComponent } from './UserStatus';
import { UserStatus } from '../types/user.types';
import Logger from '../utils/logger';

export const OnlineUsersList: React.FC = () => {
  const { userStatuses } = usePresenceStore();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    Logger.debug('OnlineUsersList: Current presence data:', {
      context: 'OnlineUsersList',
      data: {
        totalUsers: Object.keys(userStatuses).length,
        users: Object.values(userStatuses).map(user => ({
          id: user._id,
          username: user.username,
          status: user.status
        }))
      }
    });
  }, [userStatuses]);

  const onlineUsers = Object.values(userStatuses).filter(
    user => user.status === UserStatus.ONLINE
  );

  const sortedUsers = [...onlineUsers].sort((a, b) =>
    a.username.toLowerCase().localeCompare(b.username.toLowerCase())
  );

  const currentUserId = currentUser?._id?.toString();

  return (
    <Box p={4}>
      <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={4}>
        ONLINE — {onlineUsers.length}
      </Text>
      <VStack spacing={3} align="stretch">
        {/* Current user first */}
        {currentUser && currentUserId && (
          <Flex key={currentUserId} align="center" p={2} borderRadius="md" _hover={{ bg: 'gray.200' }}>
            <UserStatusComponent userId={currentUserId} />
            <Avatar size="sm" name={currentUser.username} mr={2} />
            <Text fontSize="sm">{currentUser.username} (you)</Text>
          </Flex>
        )}

        {/* Other online users */}
        {sortedUsers
          .filter(user => user._id !== currentUserId)
          .map(user => (
            <Flex key={user._id} align="center" p={2} borderRadius="md" _hover={{ bg: 'gray.200' }}>
              <UserStatusComponent userId={user._id} />
              <Avatar size="sm" name={user.username} mr={2} />
              <Text fontSize="sm">{user.username}</Text>
            </Flex>
          ))}
      </VStack>
    </Box>
  );
};
