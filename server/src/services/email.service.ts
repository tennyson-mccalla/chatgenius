import nodemailer from 'nodemailer';
import { IUser } from '../models/types';
import { WebSocketErrorType } from '../types/websocket.types';
import Logger from '../utils/logger';

class EmailError extends Error {
  details?: any;
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'EmailError';
    this.details = details;
  }
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      Logger.info('Email service initialized', {
        context: 'EmailService',
        data: { host: process.env.SMTP_HOST }
      });
    } catch (error) {
      Logger.error('Failed to initialize email service', {
        context: 'EmailService',
        code: WebSocketErrorType.AUTH_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new EmailError('Failed to initialize email service', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async sendPasswordResetEmail(user: IUser, token: string): Promise<void> {
    try {
      if (user.isGuest) {
        Logger.warn('Cannot send password reset email to guest user', {
          context: 'EmailService',
          data: { userId: user._id }
        });
        throw new EmailError('Cannot send password reset email to guest user');
      }

      Logger.info('Sending password reset email', {
        context: 'EmailService',
        data: { userId: user._id }
      });

      const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}&email=${user.email}`;

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h1>Password Reset Request</h1>
          <p>Hello ${user.username},</p>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });

      Logger.info('Password reset email sent successfully', {
        context: 'EmailService',
        data: { userId: user._id }
      });
    } catch (error) {
      Logger.error('Failed to send password reset email', {
        context: 'EmailService',
        code: WebSocketErrorType.AUTH_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new EmailError('Failed to send password reset email', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async sendWelcomeEmail(user: IUser): Promise<void> {
    try {
      if (user.isGuest) {
        Logger.warn('Cannot send welcome email to guest user', {
          context: 'EmailService',
          data: { userId: user._id }
        });
        throw new EmailError('Cannot send welcome email to guest user');
      }

      Logger.info('Sending welcome email', {
        context: 'EmailService',
        data: { userId: user._id }
      });

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: 'Welcome to ChatGenius!',
        html: `
          <h1>Welcome to ChatGenius!</h1>
          <p>Hello ${user.username},</p>
          <p>Thank you for joining ChatGenius. We're excited to have you on board!</p>
          <p>You can now start chatting with other users and create channels.</p>
          <p>If you have any questions, feel free to reach out to our support team.</p>
        `
      });

      Logger.info('Welcome email sent successfully', {
        context: 'EmailService',
        data: { userId: user._id }
      });
    } catch (error) {
      Logger.error('Failed to send welcome email', {
        context: 'EmailService',
        code: WebSocketErrorType.AUTH_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new EmailError('Failed to send welcome email', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      Logger.info('Verifying email service connection', {
        context: 'EmailService'
      });

      await this.transporter.verify();

      Logger.info('Email service connection verified', {
        context: 'EmailService'
      });
      return true;
    } catch (error) {
      Logger.error('Failed to verify email service connection', {
        context: 'EmailService',
        code: WebSocketErrorType.AUTH_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new EmailError('Failed to verify email service connection', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export { EmailService };
export const emailService = new EmailService();
