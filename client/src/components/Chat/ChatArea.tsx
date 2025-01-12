import {
  Box,
  Flex,
  Input,
  IconButton,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaPaperPlane } from 'react-icons/fa';
import { useState } from 'react';

export const ChatArea = () => {
  const [message, setMessage] = useState('');
  const headerBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleSendMessage = () => {
    if (!message.trim()) return;
    // TODO: Implement sending message
    setMessage('');
  };

  return (
    <Flex direction="column" h="full">
      {/* Chat Header */}
      <Box
        p={4}
        bg={headerBg}
        borderBottom="1px"
        borderColor={borderColor}
      >
        <Text fontSize="lg" fontWeight="bold">
          #general
        </Text>
      </Box>

      {/* Messages Area */}
      <VStack
        flex="1"
        overflowY="auto"
        spacing={4}
        p={4}
        align="stretch"
      >
        {/* TODO: Add messages here */}
        <Text>Welcome to #general!</Text>
      </VStack>

      {/* Input Area */}
      <Box p={4} borderTop="1px" borderColor={borderColor}>
        <Flex>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            mr={2}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <IconButton
            aria-label="Send message"
            icon={<FaPaperPlane />}
            onClick={handleSendMessage}
            isDisabled={!message.trim()}
          />
        </Flex>
      </Box>
    </Flex>
  );
};
