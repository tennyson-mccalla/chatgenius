import React, { useEffect } from 'react';
import { Box, VStack, Text, Button, Icon, Avatar, Flex, Tooltip } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaHashtag, FaSignOutAlt, FaLock } from 'react-icons/fa';
import { useAuthStore } from '../store/authStore';
import { useChannelStore } from '../store/channelStore';
import { useSocket } from '../hooks/useSocket';
import { UserStatus } from './UserStatus';
import { OnlineUsersList } from './OnlineUsersList';
import { usePresenceStore } from '../store/presenceStore';

export const ChannelList: React.FC = () => {
  const navigate = useNavigate();
  const { channelId } = useParams<{ channelId: string }>();
  const { user, logout } = useAuthStore();
  const { channels, fetchChannels } = useChannelStore();
  const { socket } = useSocket();
  const clearPresence = usePresenceStore(state => state.clearPresence);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleLogout = async () => {
    if (socket) {
      // Leave current channel if any
      if (channelId) {
        socket.emit('leave_channel', channelId);
      }

      // Emit offline status before disconnecting
      socket.emit('presence_update', { status: 'offline' });

      // Disconnect socket
      socket.disconnect();
    }

    // Clear presence store
    clearPresence();

    // Perform logout
    await logout();
    navigate('/login');
  };

  const handleChannelClick = (channel: any) => {
    if (!channel.hasAccess) {
      // Show a toast or alert that user doesn't have access
      return;
    }

    if (socket && channelId) {
      socket.emit('leave_channel', channelId);
    }
    navigate(`/channels/${channel.name}`);
    if (socket) {
      socket.emit('join_channel', channel._id);
    }
  };

  return (
    <Box h="100%" p={4}>
      <VStack spacing={4} align="stretch">
        {/* User Profile Section */}
        <Flex align="center" mb={6}>
          <Avatar size="sm" name={user?.username} src={user?.avatar} mr={2} />
          <Box flex="1">
            <Text fontWeight="bold">{user?.username}</Text>
            <UserStatus userId={user?._id || ''} />
          </Box>
          <Button
            size="sm"
            variant="ghost"
            colorScheme="red"
            leftIcon={<Icon as={FaSignOutAlt} />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Flex>

        {/* Channels Section */}
        <Box>
          <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={2}>
            CHANNELS
          </Text>
          <VStack spacing={1} align="stretch">
            {channels.map((channel) => (
              <Tooltip
                key={channel._id}
                label={channel.hasAccess ? channel.description : "You don't have access to this channel"}
                placement="right"
              >
                <Button
                  variant={channel.name === channelId ? 'solid' : 'ghost'}
                  colorScheme={channel.name === channelId ? 'blue' : 'gray'}
                  justifyContent="flex-start"
                  leftIcon={
                    <Flex align="center">
                      {channel.isPrivate && <Icon as={FaLock} mr={1} fontSize="xs" color="gray.500" />}
                      <Icon as={FaHashtag} />
                    </Flex>
                  }
                  onClick={() => handleChannelClick(channel)}
                  size="sm"
                  width="100%"
                  opacity={channel.hasAccess ? 1 : 0.5}
                  cursor={channel.hasAccess ? 'pointer' : 'not-allowed'}
                >
                  {channel.name}
                </Button>
              </Tooltip>
            ))}
          </VStack>
        </Box>

        {/* Online Users Section */}
        <Box mt={6}>
          <OnlineUsersList />
        </Box>
      </VStack>
    </Box>
  );
};
