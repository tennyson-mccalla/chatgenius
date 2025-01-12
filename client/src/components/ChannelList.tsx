import { useEffect } from 'react';
import {
  Box,
  VStack,
  Text,
  Button,
  Icon,
  Spinner,
  useDisclosure,
  IconButton,
} from '@chakra-ui/react';
import { FaHashtag, FaLock, FaPlus } from 'react-icons/fa';
import { useChannelStore } from '../store/channelStore';
import { CreateChannelModal } from './CreateChannelModal';

export const ChannelList = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { channels, currentChannel, isLoading, error, fetchChannels, setCurrentChannel } = useChannelStore();

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  if (isLoading) {
    return (
      <Box p={4} display="flex" justifyContent="center">
        <Spinner />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Text color="red.500">{error}</Text>
      </Box>
    );
  }

  return (
    <Box w="250px" bg="gray.50" h="100vh" p={4}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
        <Text fontSize="lg" fontWeight="bold">Channels</Text>
        <IconButton
          aria-label="Create channel"
          icon={<Icon as={FaPlus} />}
          size="sm"
          onClick={onOpen}
        />
      </Box>

      <VStack align="stretch" spacing={1}>
        {channels.map((channel) => (
          <Button
            key={channel._id}
            variant="ghost"
            justifyContent="flex-start"
            leftIcon={<Icon as={channel.isPrivate ? FaLock : FaHashtag} />}
            onClick={() => setCurrentChannel(channel)}
            bg={currentChannel?._id === channel._id ? 'gray.200' : 'transparent'}
            _hover={{ bg: 'gray.200' }}
            w="100%"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {channel.name}
          </Button>
        ))}
      </VStack>

      <CreateChannelModal isOpen={isOpen} onClose={onClose} />
    </Box>
  );
};
