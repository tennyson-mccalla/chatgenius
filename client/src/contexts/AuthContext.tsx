import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface AuthContextType {
  handleOAuthCallback: (searchParams: URLSearchParams) => void;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  handleOAuthCallback: () => {},
});

// Custom hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}

const PUBLIC_PATHS = ['/login', '/register', '/oauth/callback'];

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, checkAuth } = useAuthStore();

  useEffect(() => {
    // Skip auth check on public paths
    if (!PUBLIC_PATHS.includes(location.pathname)) {
      checkAuth();
    }
  }, [location.pathname]);

  const handleOAuthCallback = (searchParams: URLSearchParams) => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error) {
      navigate('/login?error=' + error);
      return;
    }

    if (token && refreshToken) {
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      navigate('/');
    }
  };

  useEffect(() => {
    // Handle OAuth callback
    if (location.pathname === '/oauth/callback') {
      handleOAuthCallback(new URLSearchParams(location.search));
    }
  }, [location]);

  const value = {
    handleOAuthCallback,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
