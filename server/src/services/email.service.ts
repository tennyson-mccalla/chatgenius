import nodemailer from 'nodemailer';
import { User, IUser } from '../models/User';

class EmailService {
  private transporter!: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    // If SMTP credentials are not provided, create a test account
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('Creating test email account...');
      const testAccount = await nodemailer.createTestAccount();

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log('Test email account created:');
      console.log('Username:', testAccount.user);
      console.log('Password:', testAccount.pass);
      console.log('Preview URL: https://ethereal.email');
    } else {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async sendPasswordResetEmail(user: IUser, token: string): Promise<void> {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || '"ChatGenius" <noreply@chatgenius.com>',
      to: user.email,
      subject: 'Reset Your Password - ChatGenius',
      html: `
        <h1>Password Reset Request</h1>
        <p>Hello ${user.username},</p>
        <p>You have requested to reset your password. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this password reset, please ignore this email.</p>
        <p>Best regards,<br>ChatGenius Team</p>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);

      // Log the Ethereal URL for development
      if (!process.env.SMTP_USER) {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      }
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}

export default new EmailService();
