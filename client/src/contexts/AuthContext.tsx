import React, { createContext, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export interface AuthContextType {
  user: any;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    isAuthenticated,
    isLoading,
    login: storeLogin,
    logout: storeLogout,
    checkAuth
  } = useAuthStore();

  // Get token from localStorage
  const token = localStorage.getItem('token');

  // Check auth status on mount
  useEffect(() => {
    console.log('AuthProvider: Checking auth status on mount');
    checkAuth();
  }, [checkAuth]);

  // Update API headers whenever token changes
  useEffect(() => {
    console.log('AuthProvider: Token changed', {
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 20) + '...' : null,
      isAuthenticated
    });

    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token, isAuthenticated]);

  const login = async (email: string, password: string) => {
    console.log('AuthProvider: Login attempt');
    await storeLogin(email, password);
  };

  const logout = () => {
    console.log('AuthProvider: Logout attempt');
    storeLogout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
