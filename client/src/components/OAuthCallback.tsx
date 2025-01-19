import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { Box, Spinner, Text, useToast } from '@chakra-ui/react';
import { getOAuthState, clearOAuthState } from '../utils/oauthStorage';
import { AuthState } from '../types/auth.types';
import api from '../services/api';

const logAuthState = (prefix: string, data: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[Auth ${prefix}] [${timestamp}]:`, data);
};

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, setUser, authState, user } = useAuth();
  const toast = useToast();
  const validationComplete = useRef(false);
  const authCheckRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleAuth = async () => {
      // Skip if we've already validated
      if (validationComplete.current) {
        logAuthState('Skip', 'Already validated');
        return;
      }

      const token = searchParams.get('token');
      const error = searchParams.get('error');
      const state = searchParams.get('state');

      logAuthState('Start', {
        receivedState: state,
        hasToken: !!token,
        hasError: !!error,
        tokenPreview: token ? `${token.slice(0, 10)}...` : null
      });

      // Handle error from OAuth provider
      if (error) {
        logAuthState('Error', { error });
        toast({
          title: 'Authentication Failed',
          description: error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/login', { replace: true });
        return;
      }

      // Get stored state and validate
      const storedState = getOAuthState();
      logAuthState('State', {
        storedState,
        receivedState: state,
        matches: storedState?.state === state,
        stateAge: storedState ? Date.now() - storedState.timestamp : null
      });

      if (!state || !storedState || state !== storedState.state) {
        logAuthState('Invalid', {
          receivedState: state,
          storedState: storedState?.state
        });
        toast({
          title: 'Authentication Failed',
          description: 'Invalid authentication state. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/login', { replace: true });
        return;
      }

      if (!token) {
        logAuthState('Missing', 'No token received');
        toast({
          title: 'Authentication Failed',
          description: 'No authentication token received. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/login', { replace: true });
        return;
      }

      try {
        logAuthState('Token', 'Setting token and updating API client');
        validationComplete.current = true;

        // Check existing token and headers
        const existingToken = localStorage.getItem('token');
        const existingAuth = api.defaults.headers.common['Authorization'];
        logAuthState('Before', {
          existingToken: existingToken ? `${existingToken.slice(0, 10)}...` : null,
          existingAuth: existingAuth ? `${String(existingAuth).slice(0, 15)}...` : null
        });

        // Set token in localStorage and update API client
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setToken(token);
        clearOAuthState();

        // Verify token was set
        const verifyToken = localStorage.getItem('token');
        const verifyAuth = api.defaults.headers.common['Authorization'];
        logAuthState('After', {
          verifyToken: verifyToken ? `${verifyToken.slice(0, 10)}...` : null,
          verifyAuth: verifyAuth ? `${String(verifyAuth).slice(0, 15)}...` : null
        });

        // Add small delay to ensure token is set
        await new Promise(resolve => setTimeout(resolve, 100));

        // Initial auth check
        logAuthState('Check', 'Making auth check request');
        const authResponse = await api.get('/api/auth/check');
        logAuthState('Response', {
          status: authResponse.status,
          hasUser: !!authResponse.data.user,
          userData: authResponse.data.user ? {
            id: authResponse.data.user._id,
            username: authResponse.data.user.username
          } : null
        });

        if (authResponse.data.user) {
          logAuthState('Success', 'Authentication successful, updating store and navigating');

          // Log state before update
          logAuthState('PreUpdate', {
            currentUser: user,
            currentAuthState: authState,
            newUser: authResponse.data.user
          });

          // Update user in store
          setUser(authResponse.data.user);

          // Add success toast
          toast({
            title: 'Authentication Successful',
            description: `Welcome back, ${authResponse.data.user.username}!`,
            status: 'success',
            duration: 5000,
            isClosable: true,
          });

          // Log navigation
          logAuthState('Navigation', 'Redirecting to home page');
          navigate('/', { replace: true });

          // Log completion
          logAuthState('Complete', {
            success: true,
            redirected: true
          });
          return;
        }

        throw new Error('No user data in auth response');
      } catch (error: any) {
        logAuthState('Failure', {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        toast({
          title: 'Authentication Failed',
          description: 'Failed to complete authentication. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/login', { replace: true });
      }
    };

    handleAuth();

    return () => {
      if (authCheckRef.current) {
        clearTimeout(authCheckRef.current);
      }
    };
  }, [searchParams, setToken, setUser, navigate, toast]);

  return (
    <Box display="flex" alignItems="center" justifyContent="center" height="100vh">
      <Box textAlign="center">
        <Spinner size="xl" mb={4} />
        <Text>Processing authentication...</Text>
      </Box>
    </Box>
  );
};
