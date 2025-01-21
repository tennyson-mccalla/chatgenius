import { User } from './user.types';

/**
 * Represents the possible states of authentication.
 * Used to track the lifecycle of the authentication process.
 */
export enum AuthState {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  AUTHENTICATING = 'AUTHENTICATING',
  AUTHENTICATED = 'AUTHENTICATED',
  ERROR = 'ERROR'
}

/**
 * Interface for the authentication store state.
 */
export interface AuthStoreState {
  user: User | null;
  authState: AuthState;
  error: string | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Interface for authentication store actions.
 */
export interface AuthStoreActions {
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  guestLogin: (username: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  setToken: (token: string | null) => void;
}

/**
 * Interface for authentication errors.
 */
export interface AuthError {
  message: string;
  code?: string;
  details?: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  username: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface GoogleAuthResponse {
  user: User;
  token: string;
  isNewUser: boolean;
}
