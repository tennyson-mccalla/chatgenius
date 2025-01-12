import {
  VStack,
  Box,
  Text,
  Button,
  Divider,
  useColorModeValue,
  Spacer,
  HStack,
  Avatar,
} from '@chakra-ui/react';
import { FaSignOutAlt } from 'react-icons/fa';
import { useAuthStore } from '../../store/authStore';

export const Sidebar = () => {
  const sectionBg = useColorModeValue('gray.100', 'gray.700');
  const { user, logout } = useAuthStore();

  return (
    <VStack h="full" spacing={0} align="stretch">
      {/* Header */}
      <Box p={4} bg={sectionBg}>
        <Text fontSize="lg" fontWeight="bold">
          ChatGenius
        </Text>
      </Box>

      <Divider />

      {/* Channels Section */}
      <Box p={4}>
        <Text
          textTransform="uppercase"
          fontSize="sm"
          fontWeight="bold"
          mb={2}
          color="gray.600"
        >
          Channels
        </Text>
        <Button
          variant="ghost"
          justifyContent="flex-start"
          width="full"
          leftIcon={<Text fontSize="lg">#</Text>}
        >
          general
        </Button>
      </Box>

      <Divider />

      {/* Direct Messages Section */}
      <Box p={4}>
        <Text
          textTransform="uppercase"
          fontSize="sm"
          fontWeight="bold"
          mb={2}
          color="gray.600"
        >
          Direct Messages
        </Text>
        {/* We'll add the list of users here */}
      </Box>

      <Spacer />

      {/* User Profile Section */}
      <Box p={4} bg={sectionBg} mt="auto">
        <HStack spacing={3} justify="space-between">
          <HStack spacing={3}>
            <Avatar size="sm" name={user?.username} />
            <Text fontWeight="medium">{user?.username}</Text>
          </HStack>
          <Button
            size="sm"
            variant="ghost"
            onClick={logout}
            aria-label="Logout"
            icon={<FaSignOutAlt />}
          >
            Logout
          </Button>
        </HStack>
      </Box>
    </VStack>
  );
};
