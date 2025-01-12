import { Box, Flex } from '@chakra-ui/react';
import { ChannelList } from '../components/ChannelList';

export const ChatPage = () => {
  return (
    <Flex h="100vh">
      <ChannelList />
      <Box flex="1" bg="white">
        {/* Chat content will go here */}
        <Box p={4}>Select a channel to start chatting</Box>
      </Box>
    </Flex>
  );
};
