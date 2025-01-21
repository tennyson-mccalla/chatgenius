import { create } from 'zustand';
import api, { auth } from '../services/api';
import { AuthState, AuthStoreState, AuthStoreActions, LoginCredentials, RegisterCredentials } from '../types/auth.types';
import { UserStatus } from '../types/user.types';
import { usePresenceStore } from './presence/store';
import Logger from '../utils/logger';

interface AuthStore extends AuthStoreState, AuthStoreActions {}

const initialState: AuthStoreState = {
  user: null,
  authState: AuthState.UNAUTHENTICATED,
  error: null,
  token: null,
  isLoading: true,
  isAuthenticated: false
};

export const useAuth = create<AuthStore>((set, get) => ({
  ...initialState,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null, authState: AuthState.AUTHENTICATING });
      const response = await auth.login(email, password);
      const { user, token } = response.data;

      Logger.debug('Login successful', {
        context: 'AuthStore',
        data: {
          userId: user._id,
          username: user.username
        }
      });

      set({
        user,
        token,
        isAuthenticated: true,
        authState: AuthState.AUTHENTICATED,
        error: null
      });

      localStorage.setItem('token', token);
      localStorage.setItem('userId', user._id);
    } catch (error) {
      Logger.error('Login failed', {
        context: 'AuthStore',
        data: { error }
      });
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        authState: AuthState.ERROR
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  guestLogin: async (username: string) => {
    try {
      set({ isLoading: true, error: null, authState: AuthState.AUTHENTICATING });
      const response = await api.post('/auth/guest', { username });
      const { user, token } = response.data;

      Logger.debug('Guest login successful', {
        context: 'AuthStore',
        data: {
          userId: user._id,
          username: user.username
        }
      });

      set({
        user,
        token,
        isAuthenticated: true,
        authState: AuthState.AUTHENTICATED,
        error: null
      });

      localStorage.setItem('token', token);
    } catch (error) {
      Logger.error('Guest login failed', {
        context: 'AuthStore',
        data: { error }
      });
      set({
        error: error instanceof Error ? error.message : 'Guest login failed',
        authState: AuthState.ERROR
      });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (credentials: RegisterCredentials) => {
    try {
      set({ isLoading: true, error: null, authState: AuthState.AUTHENTICATING });
      const response = await api.post('/auth/register', credentials);
      const { user, token } = response.data;

      Logger.debug('Registration successful', {
        context: 'AuthStore',
        data: {
          userId: user._id,
          username: user.username
        }
      });

      set({
        user,
        token,
        isAuthenticated: true,
        authState: AuthState.AUTHENTICATED,
        error: null
      });

      localStorage.setItem('token', token);
    } catch (error) {
      Logger.error('Registration failed', {
        context: 'AuthStore',
        data: { error }
      });
      set({
        error: error instanceof Error ? error.message : 'Registration failed',
        authState: AuthState.ERROR
      });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      const { user } = get();
      if (user) {
        // Update presence to offline before logging out
        await usePresenceStore.getState().setUserStatus(
          user._id,
          UserStatus.OFFLINE,
          user
        );
      }

      Logger.debug('Logging out', {
        context: 'AuthStore',
        data: {
          userId: user?._id,
          username: user?.username
        }
      });

      localStorage.removeItem('token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        authState: AuthState.UNAUTHENTICATED,
        error: null
      });
    } catch (error) {
      Logger.error('Logout failed', {
        context: 'AuthStore',
        data: { error }
      });
      set({
        error: error instanceof Error ? error.message : 'Logout failed',
        authState: AuthState.ERROR
      });
    }
  },

  checkAuth: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({
          authState: AuthState.UNAUTHENTICATED,
          isAuthenticated: false
        });
        return;
      }

      set({ isLoading: true, authState: AuthState.AUTHENTICATING });
      const response = await api.get('/auth/me');
      const { user } = response.data;

      set({
        user,
        token,
        isAuthenticated: true,
        authState: AuthState.AUTHENTICATED,
        error: null
      });
    } catch (error) {
      Logger.error('Auth check failed', {
        context: 'AuthStore',
        data: { error }
      });
      localStorage.removeItem('token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        authState: AuthState.UNAUTHENTICATED,
        error: error instanceof Error ? error.message : 'Authentication failed'
      });
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user) => {
    Logger.debug('Setting user', {
      context: 'AuthStore',
      data: {
        userId: user?._id,
        username: user?.username
      }
    });
    set({
      user,
      isAuthenticated: !!user,
      authState: user ? AuthState.AUTHENTICATED : AuthState.UNAUTHENTICATED
    });
  },

  setToken: (token) => {
    Logger.debug('Setting token', {
      context: 'AuthStore',
      data: { hasToken: !!token }
    });
    set({ token });
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },

  setError: (error) => {
    Logger.error('Setting error', {
      context: 'AuthStore',
      data: { error }
    });
    set({ error, authState: error ? AuthState.ERROR : AuthState.UNAUTHENTICATED });
  }
}));

export default useAuth;
