import { create } from 'zustand';
import api from '../services/api';
import { AuthState, AuthStoreState, AuthStoreActions } from '../types/auth.types';
import { UserStatus } from '../../../server/src/models/types';
import { usePresenceStore } from './presence/store';
import Logger from '../utils/logger';
import { ErrorCodes } from '../config';

export const useAuth = create<AuthStoreState & AuthStoreActions>((set, get) => ({
  // Initial state
  user: null,
  authState: AuthState.UNAUTHENTICATED,
  error: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  // Actions
  setUser: (user) => set({
    user,
    authState: user ? AuthState.AUTHENTICATED : AuthState.UNAUTHENTICATED,
    isAuthenticated: !!user
  }),
  setError: (error) => set({ error }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token });
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post('/api/auth/login', { email, password });
      const { token, user } = response.data;

      // Store token in localStorage and state
      localStorage.setItem('token', token);
      set({
        user,
        token,
        authState: AuthState.AUTHENTICATED,
        isLoading: false,
        error: null,
        isAuthenticated: true
      });
    } catch (error) {
      Logger.error('Login failed', {
        context: 'AuthStore',
        code: ErrorCodes.AUTH_CHECK_FAILED,
        data: error
      });
      set({
        user: null,
        token: null,
        authState: AuthState.ERROR,
        isLoading: false,
        error: 'Login failed',
        isAuthenticated: false
      });
      throw error;
    }
  },

  guestLogin: async (username: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post('/api/auth/guest', { username });
      const { token, user } = response.data;

      // Store token in localStorage and state
      localStorage.setItem('token', token);
      set({
        user,
        token,
        authState: AuthState.AUTHENTICATED,
        isLoading: false,
        error: null,
        isAuthenticated: true
      });
    } catch (error) {
      Logger.error('Guest login failed', {
        context: 'AuthStore',
        code: ErrorCodes.AUTH_CHECK_FAILED,
        data: error
      });
      set({
        user: null,
        token: null,
        authState: AuthState.ERROR,
        isLoading: false,
        error: 'Guest login failed',
        isAuthenticated: false
      });
      throw error;
    }
  },

  checkAuth: async () => {
    const currentState = get();
    // Skip if already authenticating or authenticated with a user
    if (currentState.authState === AuthState.AUTHENTICATING ||
        (currentState.authState === AuthState.AUTHENTICATED && currentState.user)) {
      Logger.debug('Auth check skipped', {
        context: 'AuthStore',
        data: {
          reason: currentState.authState === AuthState.AUTHENTICATING ?
            'already authenticating' : 'already authenticated',
          authState: currentState.authState,
          hasUser: !!currentState.user
        }
      });
      return;
    }

    try {
      set({ authState: AuthState.AUTHENTICATING, isLoading: true });
      const token = localStorage.getItem('token');

      if (!token) {
        set({
          user: null,
          token: null,
          authState: AuthState.UNAUTHENTICATED,
          isLoading: false,
          error: null,
          isAuthenticated: false
        });
        return;
      }

      // Set token in state before making request to ensure consistent state
      set({ token });

      const response = await api.get('/api/auth/check');
      if (response.data.user) {
        set({
          user: response.data.user,
          authState: AuthState.AUTHENTICATED,
          isLoading: false,
          error: null,
          isAuthenticated: true
        });
        usePresenceStore.getState().setUserStatus(
          response.data.user._id.toString(),
          UserStatus.ONLINE,
          {
            _id: response.data.user._id.toString(),
            username: response.data.user.username
          }
        );
      } else {
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          authState: AuthState.UNAUTHENTICATED,
          isLoading: false,
          error: null,
          isAuthenticated: false
        });
      }
    } catch (error) {
      Logger.error('Authentication check failed', {
        context: 'AuthStore',
        code: ErrorCodes.AUTH_CHECK_FAILED,
        data: error
      });
      localStorage.removeItem('token');
      set({
        user: null,
        token: null,
        authState: AuthState.ERROR,
        isLoading: false,
        error: 'Authentication check failed',
        isAuthenticated: false
      });
    }
  },

  logout: async () => {
    try {
      const { user } = useAuth.getState();
      if (user) {
        await api.post('/api/auth/logout');
        await usePresenceStore.getState().setUserStatus(
          user._id.toString(),
          UserStatus.OFFLINE,
          {
            _id: user._id.toString(),
            username: user.username
          }
        );
      }
      // Clear token from localStorage and state
      localStorage.removeItem('token');
      set({
        user: null,
        token: null,
        authState: AuthState.UNAUTHENTICATED,
        isLoading: false,
        error: null,
        isAuthenticated: false
      });
    } catch (error) {
      Logger.error('Logout failed', {
        context: 'AuthStore',
        code: ErrorCodes.LOGOUT_FAILED,
        data: error
      });
      // Force logout on client side even if server request fails
      localStorage.removeItem('token');
      set({
        user: null,
        token: null,
        authState: AuthState.UNAUTHENTICATED,
        isLoading: false,
        error: 'Logout failed',
        isAuthenticated: false
      });
    }
  }
}));

export default useAuth;
