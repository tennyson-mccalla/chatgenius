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
import { WebSocketProvider } from './contexts/WebSocketContext';

const wsUrl = isDev ? 'ws://localhost:3000/ws' : 'wss://api.chatgenius.org/ws';

const App = () => {
  const { checkAuth, isLoading, authState, isAuthenticated, token, user } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      const token = localStorage.getItem('token');
      Logger.debug('Initializing auth state', {
        context: 'App',
        data: { hasToken: !!token }
      });

      // If we're not on the OAuth callback route, clear auth data
      if (!window.location.pathname.startsWith('/oauth/callback')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        Logger.debug('Cleared auth data on startup', {
          context: 'App'
        });
      } else if (token) {
        // Only check auth if we're on the callback route and have a token
        await checkAuth();
      }

      setIsInitializing(false);
    };

    initializeApp();
  }, [checkAuth]);

  // Only show loading spinner during initial auth check
  if (isInitializing) {
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
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route
          path="/channels/:channelId?"
          element={
            <PrivateRoute>
              <WebSocketProvider>
                <ChannelPage />
              </WebSocketProvider>
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/channels" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
