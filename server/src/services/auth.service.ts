import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User } from '../models';
import { jwtConfig } from '../config/jwt.config';
import { IUser } from '../models/types';
import { WebSocketErrorType } from '../types/websocket.types';
import Logger from '../utils/logger';

class AuthError extends Error {
  details?: any;
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'AuthError';
    this.details = details;
  }
}

class AuthService {
  async login(email: string, password: string) {
    try {
      Logger.info('Attempting login', {
        context: 'AuthService',
        data: { email }
      });

      if (!email || !password) {
        throw new AuthError('Email and password are required');
      }

      const user = await User.findOne({ email });
      if (!user) {
        Logger.warn('Login failed - user not found', {
          context: 'AuthService',
          code: WebSocketErrorType.AUTH_FAILED,
          data: { email }
        });
        throw new AuthError('Invalid credentials');
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        Logger.warn('Login failed - invalid password', {
          context: 'AuthService',
          code: WebSocketErrorType.AUTH_FAILED,
          data: { email }
        });
        throw new AuthError('Invalid credentials');
      }

      const token = jwt.sign({ id: user._id }, jwtConfig.secret.toString(), {
        expiresIn: '7d'
      });

      const refreshToken = jwt.sign({ id: user._id }, jwtConfig.refreshSecret.toString(), {
        expiresIn: '30d'
      });

      Logger.info('Login successful', {
        context: 'AuthService',
        data: {
          userId: user._id.toString(),
          tokenPreview: token.substring(0, 8) + '...'
        }
      });

      return { user, token, refreshToken };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      Logger.error('Unexpected error during login', {
        context: 'AuthService',
        code: WebSocketErrorType.AUTH_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new AuthError('Authentication failed', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async createGuestUser(username: string) {
    try {
      Logger.info('Creating guest user', {
        context: 'AuthService',
        data: { username }
      });

      if (!username) {
        throw new AuthError('Username is required');
      }

      // Check if username is taken
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        Logger.warn('Guest creation failed - username taken', {
          context: 'AuthService',
          code: WebSocketErrorType.AUTH_FAILED,
          data: { username }
        });
        throw new AuthError('Username is already taken');
      }

      const user = await User.create({
        username,
        isGuest: true
      });

      const token = jwt.sign({ id: user._id }, jwtConfig.secret.toString(), {
        expiresIn: '1d'
      });

      Logger.info('Guest user created successfully', {
        context: 'AuthService',
        data: {
          userId: user._id.toString(),
          tokenPreview: token.substring(0, 8) + '...'
        }
      });

      return { user, token };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      Logger.error('Unexpected error creating guest user', {
        context: 'AuthService',
        code: WebSocketErrorType.AUTH_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new AuthError('Failed to create guest user', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      Logger.info('Attempting token refresh', {
        context: 'AuthService'
      });

      if (!refreshToken) {
        throw new AuthError('Refresh token is required');
      }

      const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret.toString()) as { id: string };
      const user = await User.findById(decoded.id);

      if (!user) {
        Logger.warn('Token refresh failed - user not found', {
          context: 'AuthService',
          code: WebSocketErrorType.AUTH_FAILED,
          data: { userId: decoded.id }
        });
        throw new AuthError('Invalid refresh token');
      }

      const token = jwt.sign({ id: user._id }, jwtConfig.secret.toString(), {
        expiresIn: '7d'
      });

      const newRefreshToken = jwt.sign({ id: user._id }, jwtConfig.refreshSecret.toString(), {
        expiresIn: '30d'
      });

      Logger.info('Token refresh successful', {
        context: 'AuthService',
        data: {
          userId: user._id.toString(),
          tokenPreview: token.substring(0, 8) + '...'
        }
      });

      return { token, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      Logger.error('Unexpected error during token refresh', {
        context: 'AuthService',
        code: WebSocketErrorType.AUTH_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new AuthError('Failed to refresh token', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export default new AuthService();
