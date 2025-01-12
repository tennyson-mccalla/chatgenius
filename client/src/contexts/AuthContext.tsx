import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface AuthContextType {
  handleOAuthCallback: (searchParams: URLSearchParams) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore();

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

  return (
    <AuthContext.Provider value={{ handleOAuthCallback }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
