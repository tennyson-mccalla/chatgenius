import axios, { AxiosRequestConfig } from 'axios';
import { isDev } from '../config';

// Extend AxiosRequestConfig to include silent option
declare module 'axios' {
  export interface AxiosRequestConfig {
    silent?: boolean;
  }
}

const baseURL = isDev ? 'http://localhost:3000' : 'https://api.chatgenius.org';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN'
});

// Add request interceptor to add token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token updates
api.interceptors.response.use(
  (response) => {
    // If the response includes a new token, update it
    const newToken = response.headers['x-auth-token'];
    if (newToken) {
      localStorage.setItem('token', newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear token on unauthorized
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const auth = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/api/auth/register', data),

  login: (email: string, password: string) => api.post('/api/auth/login', { email, password }),

  guestLogin: (data: { username: string }) =>
    api.post('/api/auth/guest', data),

  getCurrentUser: () =>
    api.get('/api/auth/me', { silent: true }),

  logout: () => api.post('/api/auth/logout'),

  // OAuth URLs - use api.defaults.baseURL
  googleAuthUrl: `/api/auth/google`,
  githubAuthUrl: `/api/auth/github`,

  forgotPassword: (email: string) => api.post('/api/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) => api.post('/api/auth/reset-password', { token, password }),

  check: () => api.get('/api/auth/check'),
};

// Channel endpoints
export const channels = {
  getAll: () =>
    api.get('/api/channels'),

  create: (data: { name: string; description?: string; isPrivate?: boolean }) =>
    api.post('/api/channels', data),

  get: (channelId: string) =>
    api.get(`/api/channels/${channelId}`),

  update: (channelId: string, data: { name?: string; description?: string; isPrivate?: boolean }) =>
    api.patch(`/api/channels/${channelId}`, data),

  delete: (channelId: string) =>
    api.delete(`/api/channels/${channelId}`),

  addMember: (channelId: string, userId: string) =>
    api.post(`/api/channels/${channelId}/members`, { userId }),

  removeMember: (channelId: string, userId: string) =>
    api.delete(`/api/channels/${channelId}/members/${userId}`),

  // DM endpoints
  createOrGetDM: (userId: string) =>
    api.post(`/api/channels/dm/${userId}`),

  getDMs: () =>
    api.get('/api/channels/dm'),
};

// Message endpoints
export const messages = {
  getChannelMessages: (channelId: string, limit = 50) =>
    api.get(`/api/messages/channel/${channelId}`, {
      params: {
        limit: Number(limit)
      }
    }),

  create: (data: { content: string; channelId: string; parentMessageId?: string }) =>
    api.post('/api/messages', data),

  markAsRead: (channelId: string) =>
    api.post(`/api/messages/channel/${channelId}/read`),
};

export default api;
