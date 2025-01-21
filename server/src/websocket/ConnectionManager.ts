import { WebSocket } from 'ws';
import { WebSocketConnection, WebSocketConnectionState, WebSocketMessageType } from '../types/websocket.types';
import Logger from '../utils/logger';

const log = {
  info: (...args: any[]) => console.log('[WebSocket]', ...args),
  error: (...args: any[]) => console.error('[WebSocket]', ...args)
};

export class ConnectionManager {
  private connections: Set<WebSocketConnection> = new Set();
  private userConnections: Map<string, Set<WebSocketConnection>> = new Map();

  constructor() {
    this.connections = new Set();
  }

  addConnection(connection: WebSocketConnection): void {
    // Clean up any existing connections for this user that aren't ready
    const existingConnections = this.userConnections.get(connection.userId) || new Set();
    for (const existingConn of existingConnections) {
      if (!existingConn.ready || existingConn.socket.readyState !== WebSocket.OPEN) {
        log.info('Cleaning up stale connection for user', {
          userId: existingConn.userId,
          username: existingConn.username,
          ready: existingConn.ready,
          readyState: existingConn.socket.readyState
        });
        this.removeConnection(existingConn);
        try {
          existingConn.socket.close(1000, 'Replaced by new connection');
        } catch (error) {
          log.error('Error closing stale connection', { error });
        }
      }
    }

    // Add the new connection
    this.connections.add(connection);

    // Update user connections map
    if (!this.userConnections.has(connection.userId)) {
      this.userConnections.set(connection.userId, new Set());
    }
    this.userConnections.get(connection.userId)!.add(connection);

    log.info('Connection added', {
      userId: connection.userId,
      username: connection.username,
      totalConnections: this.connections.size,
      userConnections: this.userConnections.get(connection.userId)?.size
    });
  }

  removeConnection(connection: WebSocketConnection): void {
    // Remove from main connections set
    this.connections.delete(connection);

    // Remove from user connections map
    const userConnections = this.userConnections.get(connection.userId);
    if (userConnections) {
      userConnections.delete(connection);
      if (userConnections.size === 0) {
        this.userConnections.delete(connection.userId);
      }
    }

    log.info('Connection removed', {
      userId: connection.userId,
      username: connection.username,
      remainingConnections: this.connections.size,
      remainingUserConnections: this.userConnections.get(connection.userId)?.size || 0
    });
  }

  getConnections(): Set<WebSocketConnection> {
    return this.connections;
  }

  getConnectionsByUserId(userId: string): Set<WebSocketConnection> {
    return this.userConnections.get(userId) || new Set();
  }

  getConnectionsByChannel(channelId: string): WebSocketConnection[] {
    return Array.from(this.connections).filter(conn =>
      conn.channels.has(channelId) && conn.socket.readyState === WebSocket.OPEN
    );
  }

  addChannelToConnection(connection: WebSocketConnection, channelId: string): void {
    connection.channels.add(channelId);
  }

  removeChannelFromConnection(connection: WebSocketConnection, channelId: string): void {
    connection.channels.delete(channelId);
  }

  broadcast(message: string, excludeSockets: WebSocket[] = []): void {
    for (const connection of this.connections) {
      if (
        connection.socket.readyState === WebSocket.OPEN &&
        !excludeSockets.includes(connection.socket)
      ) {
        try {
          connection.socket.send(message);
        } catch (error) {
          log.error('Error broadcasting message:', { error });
        }
      }
    }
  }

  updateLastSeen(connection: WebSocketConnection): void {
    connection.lastSeen = new Date();
  }

  close(): void {
    // Close all connections
    for (const connection of this.connections) {
      log.info('Closing connection during shutdown:', {
        userId: connection.userId,
        username: connection.username,
        ready: connection.ready,
        readyState: connection.socket.readyState
      });
      try {
        connection.socket.close(1000, 'Server shutting down');
      } catch (error) {
        log.error('Error closing connection during shutdown:', { error });
      }
    }

    // Clear all collections
    this.connections.clear();
    this.userConnections.clear();
  }

  public initializeConnection(socket: WebSocket, userId: string, username: string): WebSocketConnection {
    Logger.debug('Initializing new connection', {
      context: 'ConnectionManager',
      data: {
        userId,
        username
      }
    });

    const connection: WebSocketConnection = {
      socket,
      userId,
      username,
      ready: false,
      state: WebSocketConnectionState.CONNECTING,
      lastSeen: new Date(),
      timeout: null,
      channels: new Set(),
      authenticated: true
    };

    this.setupReadyStateTimeout(connection);
    this.addConnection(connection);

    return connection;
  }

  public sendAuthSuccess(connection: WebSocketConnection): void {
    if (connection.socket.readyState === WebSocket.OPEN) {
      Logger.debug('Sending AUTH_SUCCESS', {
        context: 'ConnectionManager',
        data: {
          userId: connection.userId,
          username: connection.username,
          state: connection.state
        }
      });

      connection.state = WebSocketConnectionState.CONNECTED;
      connection.socket.send(JSON.stringify({
        type: WebSocketMessageType.AUTH_SUCCESS,
        payload: {
          userId: connection.userId,
          username: connection.username
        },
        timestamp: Date.now()
      }));
    }
  }

  public handleClientReady(connection: WebSocketConnection): void {
    Logger.debug('Processing CLIENT_READY message', {
      context: 'ConnectionManager',
      data: {
        userId: connection.userId,
        username: connection.username,
        readyState: connection.socket.readyState,
        state: connection.state,
        isReady: connection.ready,
        hasTimeout: !!connection.timeout
      }
    });

    if (connection.timeout) {
      Logger.debug('Clearing ready state timeout', {
        context: 'ConnectionManager',
        data: {
          userId: connection.userId,
          username: connection.username
        }
      });
      clearTimeout(connection.timeout);
      connection.timeout = null;
    }

    connection.ready = true;
    connection.lastSeen = new Date();

    // Send READY_CONFIRMED
    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify({
        type: WebSocketMessageType.READY_CONFIRMED,
        payload: {
          userId: connection.userId,
          username: connection.username
        },
        timestamp: Date.now()
      }));
    }

    Logger.info('Connection marked as ready', {
      context: 'ConnectionManager',
      data: {
        userId: connection.userId,
        username: connection.username,
        readyState: connection.socket.readyState,
        state: connection.state,
        isReady: connection.ready,
        hasTimeout: !!connection.timeout
      }
    });
  }

  private setupReadyStateTimeout(connection: WebSocketConnection): void {
    Logger.debug('Setting up ready state timeout', {
      context: 'ConnectionManager',
      data: {
        userId: connection.userId,
        username: connection.username,
        readyState: connection.socket.readyState,
        state: connection.state,
        isReady: connection.ready,
        timeoutDuration: 10000
      }
    });

    connection.timeout = setTimeout(() => {
      if (connection && !connection.ready && connection.socket.readyState === WebSocket.OPEN) {
        Logger.warn('Closing unready connection after timeout', {
          context: 'ConnectionManager',
          data: {
            userId: connection.userId,
            username: connection.username,
            readyState: connection.socket.readyState,
            state: connection.state,
            timeoutDuration: 10000
          }
        });
        connection.socket.close(1000, 'Connection timeout - not ready');
      }
    }, 10000);
  }
}
