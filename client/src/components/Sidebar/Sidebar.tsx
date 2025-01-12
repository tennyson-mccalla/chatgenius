import {
  VStack,
  Box,
  Text,
  Button,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';

export const Sidebar = () => {
  const sectionBg = useColorModeValue('gray.100', 'gray.700');

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
    </VStack>
  );
};
