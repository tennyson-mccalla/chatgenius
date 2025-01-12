import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models';
import { jwtConfig } from '../config/jwt.config';

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

  async generateTokensForUser(userId: string): Promise<{ token: string; refreshToken: string }> {
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

    // Generate tokens
    const { token, refreshToken } = AuthService.generateTokens(user._id);

    // Update last seen
    user.lastSeen = new Date();
    user.status = 'online';
    await user.save();

    return {
      user: AuthService.sanitizeUser(user),
      token,
      refreshToken
    };
  }

  async createGuestUser(username: string): Promise<AuthResponse> {
    // Check if username is taken
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      throw new Error('Username is taken');
    }

    // Create guest user
    const user = await User.create({
      username,
      isGuest: true,
      status: 'online'
    });

    // Generate tokens
    const { token, refreshToken } = AuthService.generateTokens(user._id);

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
