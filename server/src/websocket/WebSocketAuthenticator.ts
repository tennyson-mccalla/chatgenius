import { IncomingMessage } from 'http';
import { verifyToken } from '../utils/auth';
import { User } from '../models';
import Logger from '../utils/logger';

export interface AuthenticationResult {
  userId: string;
  username: string;
}

export class WebSocketAuthenticator {
  public async authenticateConnection(req: IncomingMessage): Promise<AuthenticationResult> {
    const token = this.extractToken(req);

    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = await verifyToken(token);
    const userId = decoded.id;

    // Get username from database since it's not in the token
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const username = user.username;

    if (!userId || !username) {
      throw new Error('Invalid token payload');
    }

    Logger.debug('Connection authenticated', {
      context: 'WebSocketAuthenticator',
      data: {
        userId,
        username,
        timestamp: new Date().toISOString()
      }
    });

    return { userId, username };
  }

  private extractToken(req: IncomingMessage): string | null {
    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      return url.searchParams.get('token');
    } catch (error) {
      Logger.error('Error extracting token', {
        context: 'WebSocketAuthenticator',
        data: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return null;
    }
  }
}
