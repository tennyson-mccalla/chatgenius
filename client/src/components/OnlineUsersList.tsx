import React from 'react';
import { Box, VStack, Text, Avatar, Flex } from '@chakra-ui/react';
import { usePresenceStore } from '../store/presenceStore';

export const OnlineUsersList: React.FC = () => {
  const userPresence = usePresenceStore(state => state.userPresence);

  return (
    <Box>
      <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={2}>
        ONLINE USERS
      </Text>
      <VStack spacing={2} align="stretch">
        {Object.entries(userPresence).map(([userId, { status, user }]) => (
          <Flex key={userId} align="center" gap={2}>
            <Box
              w="10px"
              h="10px"
              borderRadius="full"
              bg={status === 'online' ? 'green.500' : 'transparent'}
              border="2px solid"
              borderColor={status === 'online' ? 'green.500' : 'gray.300'}
              boxShadow={status === 'online' ? '0 0 0 2px rgba(72, 187, 120, 0.2)' : 'none'}
            />
            <Avatar size="sm" name={user.username} src={user.avatar} />
            <Text>{user.username}</Text>
          </Flex>
        ))}
        {Object.keys(userPresence).length === 0 && (
          <Text fontSize="sm" color="gray.500">
            No users online
          </Text>
        )}
      </VStack>
    </Box>
  );
};
