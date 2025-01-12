import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Create a client for React Query
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <Router>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<div>Login Page (coming soon)</div>} />
              <Route path="/register" element={<div>Register Page (coming soon)</div>} />
              <Route path="/oauth/callback" element={<div>Processing OAuth login...</div>} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <div>Chat Interface (coming soon)</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </Router>
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default App;
