import React from 'react';
import { Box, Button, Text, VStack } from '@chakra-ui/react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box p={4}>
          <VStack spacing={4} align="stretch">
            <Text fontSize="lg" fontWeight="bold">Something went wrong</Text>
            <Text color="gray.600">{this.state.error?.message}</Text>
            <Button
              onClick={() => window.location.reload()}
              colorScheme="blue"
            >
              Reload Page
            </Button>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}
