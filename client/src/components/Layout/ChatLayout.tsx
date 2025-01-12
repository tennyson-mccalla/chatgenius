import { Box, Flex } from '@chakra-ui/react';
import { ReactNode } from 'react';

interface ChatLayoutProps {
  sidebar: ReactNode;
  content: ReactNode;
}

export const ChatLayout = ({ sidebar, content }: ChatLayoutProps) => {
  return (
    <Flex h="100vh" overflow="hidden">
      {/* Sidebar */}
      <Box
        w="250px"
        bg="gray.50"
        borderRight="1px"
        borderColor="gray.200"
        h="full"
        overflowY="auto"
      >
        {sidebar}
      </Box>

      {/* Main Content */}
      <Box flex="1" h="full" overflowY="hidden">
        {content}
      </Box>
    </Flex>
  );
};
