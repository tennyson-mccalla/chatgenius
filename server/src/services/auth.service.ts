import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models';
import { jwtConfig } from '../config/jwt.config';
import channelService from './channel.service';

interface RegisterParams {
  username: string;
  email: string;
  password: string;
}

interface AuthResponse {
  user: Partial<IUser>;
  token: string;
  refreshToken: string;
}

class AuthService {
  private static generateTokens(userId: string): { token: string; refreshToken: string } {
    const token = jwt.sign({ id: userId }, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    });

    const refreshToken = jwt.sign({ id: userId }, jwtConfig.secret, {
      expiresIn: jwtConfig.refreshExpiresIn,
    });

    return { token, refreshToken };
  }

  private static sanitizeUser(user: IUser): Partial<IUser> {
    const { password, ...sanitizedUser } = user.toObject();
    return sanitizedUser;
  }

  async generateTokens(userId: string): Promise<{ token: string; refreshToken: string }> {
    return AuthService.generateTokens(userId);
  }

  async register({ username, email, password }: RegisterParams): Promise<AuthResponse> {
    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      isGuest: false
    });

    // Add user to public channels
    await channelService.addUserToPublicChannels(user._id.toString());

    // Generate tokens
    const { token, refreshToken } = AuthService.generateTokens(user._id);

    return {
      user: AuthService.sanitizeUser(user),
      token,
      refreshToken
    };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await User.findOne({ email });

    if (!user || !user.password) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Update last seen
    user.lastSeen = new Date();
    user.status = 'online';
    await user.save();

    // Add user to public channels
    await channelService.addUserToPublicChannels(user._id.toString());

    // Generate tokens with the correct userId
    const { token, refreshToken } = AuthService.generateTokens(user._id.toString());

    return {
      user: AuthService.sanitizeUser(user),
      token,
      refreshToken
    };
  }

  async createGuestUser(username: string): Promise<AuthResponse> {
    let finalUsername = username;
    let existingUser = await User.findOne({ username: finalUsername });

    // If username exists and belongs to a guest, generate a new unique username
    if (existingUser) {
      if (!existingUser.isGuest) {
        throw new Error('Username is taken by a registered user');
      }

      // Try up to 10 times to find a unique username
      for (let i = 1; i <= 10; i++) {
        const randomNum = Math.floor(Math.random() * 1000);
        finalUsername = `${username}_${randomNum}`;
        existingUser = await User.findOne({ username: finalUsername });
        if (!existingUser) break;
      }

      // If we couldn't find a unique username after 10 tries, use timestamp
      if (existingUser) {
        finalUsername = `${username}_${Date.now()}`;
      }
    }

    // Create guest user with the final username
    const user = await User.create({
      username: finalUsername,
      email: `${finalUsername}@guest.chat`,
      isGuest: true,
      status: 'online',
      lastSeen: new Date()
    });

    // Generate tokens
    const { token, refreshToken } = AuthService.generateTokens(user._id);

    // Add user to public channels
    await channelService.addUserToPublicChannels(user._id);

    return {
      user: AuthService.sanitizeUser(user),
      token,
      refreshToken
    };
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, jwtConfig.secret) as { id: string };
      return AuthService.generateTokens(decoded.id);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      status: 'offline',
      lastSeen: new Date()
    });
  }
}

export default new AuthService();
