import { ChakraProvider } from '@chakra-ui/react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './contexts/SocketContext';
import { LoginPage } from './pages/LoginPage';
import { ChannelPage } from './pages/ChannelPage';
import { PrivateRoute } from './components/PrivateRoute';
import { OAuthCallback } from './components/OAuthCallback';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionStatus } from './components/ConnectionStatus';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';

export const App = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ChakraProvider>
      <ErrorBoundary>
        <HashRouter>
          <SocketProvider>
            <ConnectionStatus />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              <Route
                path="/channels"
                element={
                  <PrivateRoute>
                    <ChannelPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/channels/:channelId"
                element={
                  <PrivateRoute>
                    <ChannelPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <ChannelPage />
                  </PrivateRoute>
                }
              />
            </Routes>
          </SocketProvider>
        </HashRouter>
      </ErrorBoundary>
    </ChakraProvider>
  );
};

export default App;
