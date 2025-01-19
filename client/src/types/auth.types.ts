import { IUser } from '../../../server/src/models/types';

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
  user: IUser | null;
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
  setUser: (user: IUser | null) => void;
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
