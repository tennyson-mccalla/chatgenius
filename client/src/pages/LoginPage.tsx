import React, { useState } from 'react';
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
import { useAuth } from '../store/authStore';
import { setOAuthState } from '../utils/oauthStorage';
import Logger from '../utils/logger';
import api from '../services/api';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guestUsername, setGuestUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { login, guestLogin } = useAuth();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error: any) {
      Logger.error('Login failed', {
        context: 'LoginPage',
        data: {
          error: error.message,
          response: error.response?.data
        }
      });
      toast({
        title: 'Login failed',
        description: error.response?.data?.message || 'Please check your credentials',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestUsername.trim()) {
      toast({
        title: 'Username required',
        description: 'Please enter a username to continue as guest',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsGuestLoading(true);
    try {
      await guestLogin(guestUsername);
      navigate('/');
    } catch (error: any) {
      console.error('Guest login error:', error);
      toast({
        title: 'Guest login failed',
        description: error.response?.data?.message || 'An error occurred while trying to login as guest',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsGuestLoading(false);
    }
  };

  const generateState = () => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const handleGoogleLogin = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const state = generateState();

    // Store state before redirecting
    setOAuthState(state);

    // Redirect to Google OAuth endpoint with our state
    window.location.href = `${baseUrl}/api/auth/google?state=${state}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  const handleGithubLogin = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const state = generateState();

    // Store state before redirecting
    setOAuthState(state);

    // Redirect to GitHub OAuth endpoint with our state
    const githubUrl = `${baseUrl}/api/auth/github?state=${state}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    console.log('Redirecting to GitHub:', githubUrl);
    window.location.href = githubUrl;
  };

  return (
    <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
      <Box
        py={{ base: '8', sm: '8' }}
        px={{ base: '4', sm: '10' }}
        bg="white"
        boxShadow={{ base: 'none', sm: 'md' }}
        borderRadius={{ base: 'none', sm: 'xl' }}
      >
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
                  <FormLabel>Guest Username</FormLabel>
                  <Input
                    value={guestUsername}
                    onChange={(e) => setGuestUsername(e.target.value)}
                    placeholder="Enter a username"
                  />
                </FormControl>

                <Button
                  colorScheme="blue"
                  width="full"
                  type="submit"
                  isLoading={isGuestLoading}
                >
                  Continue as Guest
                </Button>

                <Button
                  variant="ghost"
                  width="full"
                  onClick={() => setIsGuestMode(false)}
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

                  <Button
                    colorScheme="blue"
                    width="full"
                    type="submit"
                    isLoading={isLoading}
                  >
                    Sign in
                  </Button>
                </VStack>
              </form>

              <VStack spacing={4}>
                <HStack w="100%">
                  <Divider />
                  <Text fontSize="sm" whiteSpace="nowrap" color="gray.500">
                    or continue with
                  </Text>
                  <Divider />
                </HStack>

                <Button
                  width="full"
                  onClick={handleGoogleLogin}
                  leftIcon={<Icon as={FaGoogle} />}
                  colorScheme="red"
                  variant="outline"
                >
                  Google
                </Button>

                <Button
                  width="full"
                  onClick={handleGithubLogin}
                  leftIcon={<Icon as={FaGithub} />}
                  colorScheme="gray"
                  variant="outline"
                >
                  GitHub
                </Button>

                <Button
                  width="full"
                  onClick={() => setIsGuestMode(true)}
                  variant="ghost"
                >
                  Continue as Guest
                </Button>
              </VStack>

              <Box textAlign="center">
                <Text>
                  Don't have an account?{' '}
                  <Link to="/register" style={{ color: 'blue' }}>
                    Sign up
                  </Link>
                </Text>
              </Box>
            </>
          )}
        </VStack>
      </Box>
    </Container>
  );
};
