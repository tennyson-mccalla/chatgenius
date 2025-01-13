import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Box, Spinner, Text } from '@chakra-ui/react';

export const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { oauthLogin } = useAuthStore();

  useEffect(() => {
    const handleAuth = async () => {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refreshToken');
      const error = searchParams.get('error');

      console.log('OAuth callback received:', {
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        error,
        searchParams: Object.fromEntries(searchParams.entries())
      });

      if (error) {
        console.error('OAuth error:', error);
        navigate('/login');
        return;
      }

      if (!token || !refreshToken) {
        console.error('Missing tokens:', { token: !!token, refreshToken: !!refreshToken });
        navigate('/login');
        return;
      }

      try {
        console.log('Attempting OAuth login with tokens');
        await oauthLogin(token, refreshToken);
        console.log('OAuth login successful, navigating to welcome screen');
        navigate('/channels');
      } catch (error) {
        console.error('OAuth login failed:', error);
        navigate('/login');
      }
    };

    handleAuth();
  }, [searchParams, oauthLogin, navigate]);

  return (
    <Box display="flex" alignItems="center" justifyContent="center" height="100vh">
      <Box textAlign="center">
        <Spinner size="xl" mb={4} />
        <Text>Processing authentication...</Text>
      </Box>
    </Box>
  );
};
