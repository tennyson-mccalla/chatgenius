import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Text,
  useToast,
  VStack,
  HStack,
  Icon,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { FaGoogle, FaGithub, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { auth } from '../services/api';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestUsername, setGuestUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { login, guestLogin } = useAuthStore();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.response?.data?.message || 'Please check your credentials',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await guestLogin(guestUsername);
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Guest login failed',
        description: error.response?.data?.message || 'Please try a different username',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Container maxW="md" py={12}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center">
          <Text fontSize="3xl" fontWeight="bold" mb={2}>
            Welcome to ChatGenius
          </Text>
          <Text color="gray.600">Sign in to continue</Text>
        </Box>

        {isGuestMode ? (
          <form onSubmit={handleGuestLogin}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Choose a username</FormLabel>
                <Input
                  value={guestUsername}
                  onChange={(e) => setGuestUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </FormControl>
              <Button colorScheme="blue" type="submit" width="full">
                Continue as Guest
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsGuestMode(false)}
                width="full"
              >
                Back to Login
              </Button>
            </VStack>
          </form>
        ) : (
          <>
            <form onSubmit={handleEmailLogin}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        icon={showPassword ? <FaEyeSlash /> : <FaEye />}
                        variant="ghost"
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
                <Button colorScheme="blue" type="submit" width="full">
                  Sign In
                </Button>
              </VStack>
            </form>

            <Stack spacing={4}>
              <Divider />
              <Text textAlign="center" color="gray.500">
                Or continue with
              </Text>
              <HStack spacing={4}>
                <Button
                  as="a"
                  href={auth.googleAuthUrl}
                  flex={1}
                  leftIcon={<Icon as={FaGoogle} />}
                  colorScheme="red"
                  variant="outline"
                >
                  Google
                </Button>
                <Button
                  as="a"
                  href={auth.githubAuthUrl}
                  flex={1}
                  leftIcon={<Icon as={FaGithub} />}
                  colorScheme="gray"
                  variant="outline"
                >
                  GitHub
                </Button>
              </HStack>
              <Button
                variant="ghost"
                onClick={() => setIsGuestMode(true)}
              >
                Continue as Guest
              </Button>
            </Stack>

            <Text textAlign="center" mt={4}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'blue' }}>
                Sign up
              </Link>
            </Text>
          </>
        )}
      </VStack>
    </Container>
  );
};
