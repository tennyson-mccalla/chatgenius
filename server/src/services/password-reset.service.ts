import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { PasswordReset } from '../models/PasswordReset';
import emailService from './email.service';

class PasswordResetService {
  private static RESET_TOKEN_EXPIRES_IN = 3600000; // 1 hour in milliseconds

  async createResetToken(email: string): Promise<void> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('No user found with this email address');
    }

    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PasswordResetService.RESET_TOKEN_EXPIRES_IN);

    // Remove any existing reset tokens for this user
    await PasswordReset.deleteMany({ user: user._id });

    // Create new reset token
    await PasswordReset.create({
      user: user._id,
      token,
      expiresAt
    });

    // Send the reset email
    await emailService.sendPasswordResetEmail(user, token);
  }

  async verifyToken(token: string): Promise<boolean> {
    const resetToken = await PasswordReset.findOne({
      token,
      expiresAt: { $gt: new Date() }
    });

    return !!resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await PasswordReset.findOne({
      token,
      expiresAt: { $gt: new Date() }
    }).populate('user');

    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user's password
    await User.findByIdAndUpdate(resetToken.user._id, {
      password: hashedPassword
    });

    // Delete the used token
    await PasswordReset.deleteOne({ _id: resetToken._id });
  }
}

export default new PasswordResetService();
