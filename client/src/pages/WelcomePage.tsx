import React from 'react';
import { Box, VStack, Heading, Text, Button, Icon } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useChannelStore } from '../store/channel/store';
import { useAuth } from '../store/authStore';
import { useEffect } from 'react';
import { BsChatDotsFill } from 'react-icons/bs';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { channels, fetchChannels, fetchDMChannels } = useChannelStore();
  const { user } = useAuth();

  useEffect(() => {
    // Fetch channels on mount
    Promise.all([fetchChannels(), fetchDMChannels()]);
  }, [fetchChannels, fetchDMChannels]);

  const handleStartChatting = () => {
    if (channels.length > 0) {
      navigate(`/channels/${channels[0]._id}`);
    } else {
      navigate('/channels');
    }
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bg="gray.50"
    >
      <VStack spacing={8} maxW="600px" textAlign="center" p={8}>
        <Icon
          as={BsChatDotsFill}
          w={20}
          h={20}
          color="blue.500"
          mb={4}
        />
        <Heading size="2xl" color="blue.600">
          Welcome to ChatGenius
        </Heading>
        <Text fontSize="2xl" color="blue.500" fontWeight="medium">
          Hello, {user?.username || 'there'}!
        </Text>
        <Text fontSize="xl" color="gray.600" lineHeight="tall">
          Your modern, real-time chat platform for seamless communication.
          Join channels, start conversations, and connect with others instantly.
        </Text>
        <Button
          colorScheme="blue"
          size="lg"
          onClick={handleStartChatting}
          px={8}
          py={6}
          fontSize="lg"
        >
          Start Chatting
        </Button>
      </VStack>
    </Box>
  );
};
