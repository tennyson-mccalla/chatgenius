import { create } from 'zustand';
import { auth } from '../services/api';

interface User {
  _id: string;
  username: string;
  email?: string;
  avatar?: string;
  isGuest: boolean;
  status: 'online' | 'offline' | 'away';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  guestLogin: (username: string) => Promise<void>;
  oauthLogin: (token: string, refreshToken: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  const token = localStorage.getItem('token');

  return {
    user: null,
    token,
    isAuthenticated: !!token,
    isLoading: true,
    error: null,

    setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

    login: async (email, password) => {
      try {
        set({ isLoading: true, error: null });
        const response = await auth.login({ email, password });
        const { token } = response.data;

        localStorage.setItem('token', token);

        // Get user data after setting token
        const userResponse = await auth.getCurrentUser();
        const user = userResponse.data;

        set({ user, token, isAuthenticated: true, error: null });
      } catch (error: any) {
        set({ error: error.response?.data?.message || 'Login failed' });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    register: async (username, email, password) => {
      try {
        set({ isLoading: true, error: null });
        const response = await auth.register({ username, email, password });
        const { token } = response.data;

        localStorage.setItem('token', token);

        // Get user data after setting token
        const userResponse = await auth.getCurrentUser();
        const user = userResponse.data;

        set({ user, token, isAuthenticated: true, error: null });
      } catch (error: any) {
        set({ error: error.response?.data?.message || 'Registration failed' });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    guestLogin: async (username) => {
      try {
        set({ isLoading: true, error: null });
        const response = await auth.guestLogin({ username });
        const { token } = response.data;

        localStorage.setItem('token', token);

        // Get user data after setting token
        const userResponse = await auth.getCurrentUser();
        const user = userResponse.data;

        set({ user, token, isAuthenticated: true, error: null });
      } catch (error: any) {
        set({ error: error.response?.data?.message || 'Guest login failed' });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    oauthLogin: async (token, refreshToken) => {
      try {
        set({ isLoading: true, error: null });

        // Store tokens
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);

        // Get user data
        const userResponse = await auth.getCurrentUser();
        const user = userResponse.data;

        set({ user, token, isAuthenticated: true, error: null });
      } catch (error: any) {
        set({ error: error.response?.data?.message || 'OAuth login failed' });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    logout: async () => {
      try {
        console.log('Logging out user');
        await auth.logout();
      } catch (error) {
        console.error('Error logging out:', error);
      } finally {
        console.log('Cleaning up auth state');
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      }
    },

    checkAuth: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        return;
      }

      try {
        set({ isLoading: true });
        const response = await auth.getCurrentUser();
        set({ user: response.data, token, isAuthenticated: true, error: null });
      } catch (error) {
        // Clear tokens if they're invalid
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false, error: null });
      } finally {
        set({ isLoading: false });
      }
    },
  };
});
