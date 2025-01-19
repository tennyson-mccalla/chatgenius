import { Box, Text, HStack, VStack, Button, Popover, PopoverTrigger, PopoverContent, PopoverBody, Tooltip } from '@chakra-ui/react';
import { useAuth } from '../store/authStore';
import { useChannelStore } from '../store/channel/store';
import { useReactions, SUPPORTED_REACTIONS } from '../features/reactions';
import { useMemo, useCallback } from 'react';

interface MessageProps {
  id: string;
  content: string;
  sender?: {
    _id: string;
    username: string;
  };
  timestamp: string;
  reactions?: Array<{
    emoji: string;
    users: string[];
  }>;
}

export function Message({ id, content, sender, timestamp, reactions: initialReactions = [] }: MessageProps) {
  const { user } = useAuth();
  const { currentChannel } = useChannelStore();
  const { reactions: liveReactions, toggleReaction } = useReactions(
    id,
    currentChannel?._id || '',
    initialReactions,
    {
      onError: (error: Error) => console.error('Reaction error:', error)
    }
  );

  // Format timestamp
  const formattedTime = useMemo(() => new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  }), [timestamp]);

  // Get username for a user ID
  const getUsernameById = useCallback((userId: string) => {
    if (userId === user?._id) return 'You';
    // Check if it's the message sender
    if (userId === sender?._id) return sender.username;
    // Check channel members
    const member = currentChannel?.members?.find(m => m._id === userId);
    return member?.username || 'Unknown User';
  }, [user?._id, sender, currentChannel?.members]);

  // Handle reaction toggle
  const handleReactionClick = useCallback((emoji: string) => {
    if (!user) return;
    toggleReaction(emoji, user._id);
  }, [user, toggleReaction]);

  return (
    <VStack align="start" spacing={1} w="100%" p={2}>
      <HStack spacing={2}>
        <Text fontWeight="bold">
          {(typeof sender === 'object' ? sender?.username : null) || 'Unknown User'}
        </Text>
        <Text fontSize="sm" color="gray.500">{formattedTime}</Text>
      </HStack>
      <Text>{content}</Text>

      {/* Reactions */}
      <HStack spacing={1} mt={1}>
        {Object.entries(liveReactions).map(([emoji, userIds]) => (
          <Tooltip
            key={emoji}
            label={userIds.map(id => getUsernameById(id)).join(', ')}
            placement="top"
          >
            <Button
              size="xs"
              variant={userIds.includes(user?._id || '') ? 'solid' : 'outline'}
              onClick={() => handleReactionClick(emoji)}
              px={2}
              py={1}
            >
              {emoji} {userIds.length}
            </Button>
          </Tooltip>
        ))}

        {/* Add reaction button */}
        <Popover placement="top">
          <PopoverTrigger>
            <Button size="xs" variant="ghost" px={2} py={1}>
              <Text fontSize="lg">+</Text>
            </Button>
          </PopoverTrigger>
          <PopoverContent w="auto">
            <PopoverBody>
              <HStack spacing={1} wrap="wrap">
                {Object.values(SUPPORTED_REACTIONS).map(reaction => (
                  <Button
                    key={reaction}
                    size="sm"
                    variant="ghost"
                    onClick={() => handleReactionClick(reaction)}
                  >
                    {reaction}
                  </Button>
                ))}
              </HStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </HStack>
    </VStack>
  );
}
