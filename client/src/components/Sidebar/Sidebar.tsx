import {
  VStack,
  Box,
  Button,
  Icon,
} from '@chakra-ui/react';
import { FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../../store/authStore';
import { ChannelList } from '../ChannelList';
import { DMList } from '../DMList';

export const Sidebar = () => {
  const { logout } = useAuth();

  return (
    <VStack
      align="stretch"
      p={4}
      borderRight="1px"
      borderColor="gray.200"
      spacing={6}
      overflowY="auto"
      h="100vh"
      bg="gray.100"
    >
      <ChannelList />
      <DMList />
      <Box mt="auto" pt={4} borderTop="1px" borderColor="gray.200">
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
  );
};
