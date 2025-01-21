import React from 'react';
import { VStack, Text, Button, Icon, Badge } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';
import { useChannelStore } from '../store/channel/store';
import { useAuth } from '../store/authStore';
import { useUnreadStore } from '../store/unread/store';

export const DMList: React.FC = () => {
  const { channels, focusedChannelId } = useChannelStore();
  const { user } = useAuth();
  const { unreadCounts } = useUnreadStore();
  const navigate = useNavigate();

  const handleChannelClick = (channelId: string) => {
    navigate(`/channels/${channelId}`);
  };

  const dmChannels = channels.filter(channel => channel.isDM);

  const getOtherUserName = (channel: any) => {
    if (!channel.members || channel.members.length !== 2) return 'Unknown User';

    // Convert user._id to string for comparison
    const currentUserId = user?._id?.toString();

    const otherMember = channel.members.find((member: any) => {
      // Handle both string IDs and object IDs by converting both to strings
      const memberId = typeof member === 'object' ? member._id?.toString() : member?.toString();
      return memberId !== currentUserId;
    });

    return otherMember?.username || 'Unknown User';
  };

  return (
    <VStack align="stretch" spacing={1}>
      <Text fontWeight="bold" fontSize="sm" color="gray.600" mb={2}>
        Direct Messages
      </Text>
      {dmChannels.map((channel) => (
        <Button
          key={channel._id}
          variant="ghost"
          justifyContent="space-between"
          py={2}
          px={4}
          h="auto"
          onClick={() => handleChannelClick(channel._id)}
          bg={focusedChannelId === channel._id ? 'blue.100' : 'transparent'}
          _hover={{
            bg: focusedChannelId === channel._id ? 'blue.200' : 'gray.100'
          }}
          leftIcon={<Icon as={FaUser} color="gray.500" />}
          width="100%"
        >
          <Text
            fontSize="sm"
            color="gray.700"
            isTruncated
          >
            {getOtherUserName(channel)}
          </Text>
          {unreadCounts[channel._id] > 0 && (
            <Badge
              colorScheme="red"
              borderRadius="full"
              px={2}
              ml={2}
            >
              {unreadCounts[channel._id]}
            </Badge>
          )}
        </Button>
      ))}
    </VStack>
  );
};
