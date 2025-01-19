import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PrivateRoute } from './components/PrivateRoute';
import { LoginPage } from './pages/LoginPage';
import { ChannelPage } from './pages/ChannelPage';
import { OAuthCallback } from './components/OAuthCallback';
import { useAuth } from './store/authStore';
import { isDev } from './config';
import { Center, Spinner } from '@chakra-ui/react';
import Logger from './utils/logger';

const wsUrl = isDev ? 'ws://localhost:3000/ws' : 'wss://api.chatgenius.org/ws';

const App = () => {
  const { checkAuth, isLoading, authState, isAuthenticated } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize auth state from stored token
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          Logger.debug('Initializing auth state', {
            context: 'App',
            data: { hasToken: true }
          });
          await checkAuth();
        } else {
          Logger.debug('No token found during initialization', {
            context: 'App'
          });
        }
      } catch (error) {
        Logger.error('Failed to initialize auth state', {
          context: 'App',
          data: { error }
        });
      } finally {
        setIsInitializing(false);
      }
    };

    // Only initialize if not already authenticated
    if (!isAuthenticated) {
      initializeAuth();
    } else {
      setIsInitializing(false);
    }
  }, [checkAuth, isAuthenticated]);

  if (isInitializing || isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route
          path="/channels/:channelId?"
          element={
            <PrivateRoute>
              <ChannelPage />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/channels" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
