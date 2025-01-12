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
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { login, guestLogin } = useAuthStore();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
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

  return (
    <Container maxW="lg" py={{ base: '12', md: '24' }} px={{ base: '0', sm: '8' }}>
      <Box
        py={{ base: '8', sm: '8' }}
        px={{ base: '4', sm: '10' }}
        bg="white"
        boxShadow={{ base: 'none', sm: 'md' }}
        borderRadius={{ base: 'none', sm: 'xl' }}
      >
        <form onSubmit={handleEmailLogin}>
          <VStack spacing="6">
            <Text fontSize="2xl" fontWeight="bold">
              Welcome to ChatGenius
            </Text>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input
                name="username"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <InputGroup>
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <Box display="flex" justifyContent="flex-end" mt={2}>
                <Button
                  variant="link"
                  colorScheme="blue"
                  size="sm"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot password?
                </Button>
              </Box>
            </FormControl>
            <Button
              type="submit"
              colorScheme="blue"
              width="full"
              isLoading={isLoading}
            >
              Sign in
            </Button>
            <Divider />
            <Button
              width="full"
              leftIcon={<FaGoogle />}
              onClick={() => window.location.href = auth.googleAuthUrl}
            >
              Continue with Google
            </Button>
            <Button
              width="full"
              leftIcon={<FaGithub />}
              onClick={() => window.location.href = auth.githubAuthUrl}
            >
              Continue with GitHub
            </Button>
            <Divider />
            <FormControl>
              <Input
                placeholder="Enter username for guest access"
                value={guestUsername}
                onChange={(e) => setGuestUsername(e.target.value)}
              />
            </FormControl>
            <Button
              width="full"
              variant="outline"
              onClick={handleGuestLogin}
              isLoading={isGuestLoading}
            >
              Continue as Guest
            </Button>
            <Text>
              Don't have an account?{' '}
              <Button
                variant="link"
                colorScheme="blue"
                onClick={() => navigate('/register')}
              >
                Sign up
              </Button>
            </Text>
          </VStack>
        </form>
      </Box>
    </Container>
  );
};
