import {
  VStack,
  Box,
  Button,
  Icon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { FaSignOutAlt, FaSearch } from 'react-icons/fa';
import { useAuth } from '../../store/authStore';
import { ChannelList } from '../ChannelList';
import { DMList } from '../DMList';
import { SearchMessages } from '../SearchMessages';

export const Sidebar = () => {
  const { logout } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();

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
      <Button
        leftIcon={<Icon as={FaSearch} />}
        colorScheme="blue"
        variant="solid"
        size="sm"
        width="full"
        onClick={onOpen}
      >
        Search Messages
      </Button>
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

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Search Messages</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <SearchMessages onClose={onClose} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
};
