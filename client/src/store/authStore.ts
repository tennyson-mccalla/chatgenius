import { create } from 'zustand';
import { auth } from '../services/api';

interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  isGuest: boolean;
  status: 'online' | 'offline' | 'away';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  guestLogin: (username: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const response = await auth.login({ email, password });
      const { user, token, refreshToken } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

      set({ user, isAuthenticated: true, error: null });
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
      const { user, token, refreshToken } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

      set({ user, isAuthenticated: true, error: null });
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
      const { user, token, refreshToken } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

      set({ user, isAuthenticated: true, error: null });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Guest login failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await auth.logout();
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      const response = await auth.getCurrentUser();
      set({ user: response.data, isAuthenticated: true, error: null });
    } catch (error) {
      // Clear tokens if they're invalid
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false, error: null });
    } finally {
      set({ isLoading: false });
    }
  },
}));
