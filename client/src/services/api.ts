import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to always use the latest token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const auth = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  guestLogin: (data: { username: string }) =>
    api.post('/auth/guest', data),

  getCurrentUser: () =>
    api.get('/auth/me'),

  logout: () =>
    api.post('/auth/logout'),

  // OAuth URLs
  googleAuthUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/google`,
  githubAuthUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/github`,

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

// Channel endpoints
export const channels = {
  getAll: () =>
    api.get('/channels'),

  create: (data: { name: string; description?: string; isPrivate?: boolean }) =>
    api.post('/channels', data),

  get: (channelId: string) =>
    api.get(`/channels/${channelId}`),

  update: (channelId: string, data: { name?: string; description?: string; isPrivate?: boolean }) =>
    api.patch(`/channels/${channelId}`, data),

  delete: (channelId: string) =>
    api.delete(`/channels/${channelId}`),

  addMember: (channelId: string, userId: string) =>
    api.post(`/channels/${channelId}/members`, { userId }),

  removeMember: (channelId: string, userId: string) =>
    api.delete(`/channels/${channelId}/members/${userId}`),
};

export default api;
