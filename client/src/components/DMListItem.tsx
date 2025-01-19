import React, { memo, useMemo } from 'react';
import { Button, Text, Badge, Flex } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Channel } from '../store/channel/types';
import { UserStatus } from './UserStatus';

interface DMListItemProps {
  channel: Channel;
  currentUserId: string;
  isCurrentChannel: boolean;
  unreadCount: number;
}

export const DMListItem = memo<DMListItemProps>(({
  channel,
  currentUserId,
  isCurrentChannel,
  unreadCount
}) => {
  const navigate = useNavigate();

  // Memoize other user computation
  const otherUser = useMemo(() => {
    const other = channel.members?.find(member => {
      if (typeof member === 'string') {
        return member !== currentUserId;
      }
      return member._id !== currentUserId;
    });

    if (!other) {
      console.error('DMListItem: Invalid member data', {
        channelId: channel._id,
        members: channel.members,
        currentUserId
      });
      return null;
    }

    return other;
  }, [channel.members, currentUserId, channel._id]);

  if (!otherUser) return null;

  // Get username and ID from populated member data or show loading state
  const otherUsername = typeof otherUser === 'string' ? 'Loading...' : otherUser.username;
  const otherUserId = typeof otherUser === 'string' ? otherUser : otherUser._id;

  return (
    <Button
      key={channel._id}
      variant={isCurrentChannel ? 'solid' : 'ghost'}
      justifyContent="space-between"
      width="100%"
      onClick={() => navigate(`/channels/${channel._id}`)}
      bg={isCurrentChannel ? 'blue.500' : 'transparent'}
      color={isCurrentChannel ? 'white' : 'inherit'}
      _hover={{ bg: isCurrentChannel ? 'blue.600' : 'gray.100' }}
    >
      <Flex align="center">
        <UserStatus userId={otherUserId} />
        <Text>{otherUsername}</Text>
      </Flex>
      {unreadCount > 0 && (
        <Badge
          colorScheme="red"
          borderRadius="full"
          px={2}
          ml={2}
        >
          {unreadCount}
        </Badge>
      )}
    </Button>
  );
});

DMListItem.displayName = 'DMListItem';
