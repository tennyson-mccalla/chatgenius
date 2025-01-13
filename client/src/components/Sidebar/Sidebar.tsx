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
  Icon,
} from '@chakra-ui/react';
import { FaSignOutAlt } from 'react-icons/fa';
import { useAuthStore } from '../../store/authStore';
import { ChannelList } from '../ChannelList';
import { OnlineUsersList } from '../OnlineUsersList';

export const Sidebar = () => {
  const sectionBg = useColorModeValue('gray.100', 'gray.700');
  const { user, logout } = useAuthStore();

  return (
    <Box
      as="nav"
      pos="fixed"
      left="0"
      h="100vh"
      w="250px"
      bg="gray.800"
      color="white"
      overflowY="auto"
    >
      <VStack h="full" align="stretch" spacing={0}>
        <ChannelList />
        <Box flex="1" />
        <OnlineUsersList />
        <Box p={4} borderTop="1px" borderColor="gray.700">
          <Button
            leftIcon={<Icon as={FaSignOutAlt} />}
            colorScheme="gray"
            variant="ghost"
            size="sm"
            width="full"
            onClick={logout}
          >
            Logout
          </Button>
        </Box>
      </VStack>
    </Box>
  );
};
