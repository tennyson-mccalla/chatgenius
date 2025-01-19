import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';

export interface WebSocketConnection {
  socket: WebSocket;
  userId: string;
  username: string;
  channels: Set<string>;
  lastSeen: Date;
  authenticated: boolean;
}

export interface WebSocketServerConfig {
  path?: string;
  maxReconnectDelay?: number;
  maxAttempts?: number;
  timeout?: number;
  debug?: boolean;
}

export interface WebSocketHandler {
  handleMessage(connection: WebSocketConnection, message: any): Promise<void>;
}
