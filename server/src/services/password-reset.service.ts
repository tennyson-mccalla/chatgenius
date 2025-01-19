import { User } from '../models';
import { WebSocketErrorType } from '../types/websocket.types';
import Logger from '../utils/logger';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

class PasswordResetError extends Error {
  details?: any;
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'PasswordResetError';
    this.details = details;
  }
}

class PasswordResetService {
  async generateResetToken(email: string): Promise<string> {
    try {
      Logger.info('Generating reset token', {
        context: 'PasswordResetService',
        data: { email }
      });

      const user = await User.findOne({ email });
      if (!user) {
        Logger.warn('User not found for reset token', {
          context: 'PasswordResetService',
          code: WebSocketErrorType.AUTH_FAILED,
          data: { email }
        });
        throw new PasswordResetError('No account found with this email');
      }

      const token = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(token, 10);

      user.resetToken = hashedToken;
      user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      Logger.info('Reset token generated successfully', {
        context: 'PasswordResetService',
        data: { userId: user._id }
      });

      return token;
    } catch (error) {
      if (error instanceof PasswordResetError) {
        throw error;
      }
      Logger.error('Failed to generate reset token', {
        context: 'PasswordResetService',
        code: WebSocketErrorType.AUTH_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new PasswordResetError('Failed to generate reset token', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async verifyResetToken(token: string, email: string): Promise<boolean> {
    try {
      Logger.info('Verifying reset token', {
        context: 'PasswordResetService',
        data: { email }
      });

      const user = await User.findOne({ email });
      if (!user || !user.resetToken || !user.resetTokenExpiry) {
        Logger.warn('Invalid reset attempt', {
          context: 'PasswordResetService',
          code: WebSocketErrorType.AUTH_FAILED,
          data: { email }
        });
        throw new PasswordResetError('Invalid or expired reset token');
      }

      if (user.resetTokenExpiry < new Date()) {
        Logger.warn('Expired reset token', {
          context: 'PasswordResetService',
          code: WebSocketErrorType.AUTH_FAILED,
          data: { email }
        });
        throw new PasswordResetError('Reset token has expired');
      }

      const isValid = await bcrypt.compare(token, user.resetToken);
      if (!isValid) {
        Logger.warn('Invalid reset token', {
          context: 'PasswordResetService',
          code: WebSocketErrorType.AUTH_FAILED,
          data: { email }
        });
        throw new PasswordResetError('Invalid reset token');
      }

      Logger.info('Reset token verified successfully', {
        context: 'PasswordResetService',
        data: { userId: user._id }
      });

      return true;
    } catch (error) {
      if (error instanceof PasswordResetError) {
        throw error;
      }
      Logger.error('Failed to verify reset token', {
        context: 'PasswordResetService',
        code: WebSocketErrorType.AUTH_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new PasswordResetError('Failed to verify reset token', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async resetPassword(token: string, email: string, newPassword: string): Promise<void> {
    try {
      Logger.info('Resetting password', {
        context: 'PasswordResetService',
        data: { email }
      });

      const user = await User.findOne({ email });
      if (!user || !user.resetToken || !user.resetTokenExpiry) {
        Logger.warn('Invalid reset attempt', {
          context: 'PasswordResetService',
          code: WebSocketErrorType.AUTH_FAILED,
          data: { email }
        });
        throw new PasswordResetError('Invalid or expired reset token');
      }

      const isValid = await bcrypt.compare(token, user.resetToken);
      if (!isValid) {
        Logger.warn('Invalid reset token', {
          context: 'PasswordResetService',
          code: WebSocketErrorType.AUTH_FAILED,
          data: { email }
        });
        throw new PasswordResetError('Invalid reset token');
      }

      if (user.resetTokenExpiry < new Date()) {
        Logger.warn('Expired reset token', {
          context: 'PasswordResetService',
          code: WebSocketErrorType.AUTH_FAILED,
          data: { email }
        });
        throw new PasswordResetError('Reset token has expired');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();

      Logger.info('Password reset successfully', {
        context: 'PasswordResetService',
        data: { userId: user._id }
      });
    } catch (error) {
      if (error instanceof PasswordResetError) {
        throw error;
      }
      Logger.error('Failed to reset password', {
        context: 'PasswordResetService',
        code: WebSocketErrorType.AUTH_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new PasswordResetError('Failed to reset password', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export const passwordResetService = new PasswordResetService();
