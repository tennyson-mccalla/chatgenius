import React, { createContext, useContext } from 'react';
import { useAuth } from '../store/authStore';
import type { AuthStoreState, AuthStoreActions } from '../types/auth.types';
import { AuthState } from '../types/auth.types';

export type AuthContextType = Pick<
  AuthStoreState & AuthStoreActions,
  'user' | 'token' | 'state' | 'isLoading' | 'login' | 'logout'
>;

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  state: AuthState.UNAUTHENTICATED,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();

  const value: AuthContextType = {
    user: auth.user,
    token: auth.token,
    state: auth.state,
    isLoading: auth.isLoading,
    login: auth.login,
    logout: auth.logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);
