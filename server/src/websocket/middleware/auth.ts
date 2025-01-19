import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { User } from '../../models';
import { WebSocketMessageType, AuthPayload, WebSocketError, WebSocketErrorType } from '../../types/websocket.types';
import { jwtConfig } from '../../config/jwt.config';

export async function authenticateConnection(
  socket: WebSocket & { userId?: string; username?: string; authenticated?: boolean; authTimer?: NodeJS.Timeout },
  message: { type: WebSocketMessageType; payload: AuthPayload }
): Promise<WebSocketError | null> {
  try {
    // Clear any existing auth timer
    if (socket.authTimer) {
      clearTimeout(socket.authTimer);
      socket.authTimer = undefined;
    }

    // Validate message type
    if (message.type !== WebSocketMessageType.AUTH) {
      return {
        type: WebSocketErrorType.AUTH_FAILED,
        message: 'Invalid authentication message type',
        timestamp: Date.now()
      };
    }

    // Verify token
    const decoded = jwt.verify(message.payload.token, jwtConfig.secret) as { id: string };
    if (!decoded || !decoded.id) {
      return {
        type: WebSocketErrorType.AUTH_FAILED,
        message: 'Invalid token',
        timestamp: Date.now()
      };
    }

    // Get user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return {
        type: WebSocketErrorType.AUTH_FAILED,
        message: 'User not found',
        timestamp: Date.now()
      };
    }

    // Attach user info to socket
    socket.userId = decoded.id;
    socket.username = user.username;
    socket.authenticated = true;

    return null;
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      type: WebSocketErrorType.AUTH_FAILED,
      message: 'Authentication failed',
      timestamp: Date.now(),
      data: error instanceof Error ? error.message : undefined
    };
  }
}

export function isAuthenticated(socket: WebSocket & { userId?: string; authenticated?: boolean }): boolean {
  return Boolean(socket.authenticated && socket.userId);
}

export function getUserId(socket: WebSocket & { userId?: string }): string | null {
  return socket.userId || null;
}

export function getUsername(socket: WebSocket & { username?: string }): string | null {
  return socket.username || null;
}

// Utility function to verify token without socket
export async function verifyToken(token: string): Promise<string | null> {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as { id: string };
    return decoded.id;
  } catch {
    return null;
  }
}

// Utility function to start authentication timeout
export function startAuthTimeout(
  socket: WebSocket & { authTimer?: NodeJS.Timeout; authenticated?: boolean },
  timeoutMs: number = 10000
): void {
  // Clear any existing timer
  if (socket.authTimer) {
    clearTimeout(socket.authTimer);
  }

  // Set new timer
  socket.authTimer = setTimeout(() => {
    if (!socket.authenticated) {
      console.log('[WS] Authentication timeout after', timeoutMs, 'ms');
      socket.close(1005, 'Authentication timeout');
    }
  }, timeoutMs);
}
