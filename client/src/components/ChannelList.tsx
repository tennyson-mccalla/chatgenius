import React from 'react';
import { Box, VStack, Text, Button, Icon, useDisclosure, Flex } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { IoAdd } from 'react-icons/io5';
import { FaHashtag, FaLock } from 'react-icons/fa';
import { useChannelStore } from '../store/channel/store';
import { CreateChannelModal } from './CreateChannelModal';

export const ChannelList: React.FC = () => {
  const { getNonDMChannels, focusedChannelId } = useChannelStore();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleChannelClick = (channelId: string) => {
    navigate(`/channels/${channelId}`);
  };

  const nonDMChannels = getNonDMChannels();

  return (
    <VStack align="stretch" spacing={1}>
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontWeight="bold" fontSize="sm" color="gray.600">
          Channels
        </Text>
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpen}
          leftIcon={<Icon as={IoAdd} />}
          aria-label="Create Channel"
        >
          Create
        </Button>
      </Flex>

      {nonDMChannels.map((channel) => (
        <Button
          key={channel._id}
          variant="ghost"
          justifyContent="flex-start"
          py={2}
          px={4}
          h="auto"
          onClick={() => handleChannelClick(channel._id)}
          bg={focusedChannelId === channel._id ? 'blue.100' : 'transparent'}
          _hover={{
            bg: focusedChannelId === channel._id ? 'blue.200' : 'gray.100'
          }}
          leftIcon={
            <Icon
              as={channel.isPrivate ? FaLock : FaHashtag}
              color="gray.500"
            />
          }
        >
          <Text fontSize="sm" color="gray.700">
            {channel.name}
          </Text>
        </Button>
      ))}

      <CreateChannelModal isOpen={isOpen} onClose={onClose} />
    </VStack>
  );
};
