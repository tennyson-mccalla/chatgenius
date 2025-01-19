import { WebSocket, WebSocketServer as WSServer } from 'ws';
import { IncomingMessage } from 'http';
import { WebSocketConnection, WebSocketServerConfig } from './types';
import { ConnectionManager } from './ConnectionManager';
import { ChannelManager } from './ChannelManager';
import { MessageHandler } from './MessageHandler';
import { verifyToken } from './middleware/auth';
import { WebSocketMessageType, ChannelMember, Channel as WSChannel } from '../types/websocket.types';
import { User, Channel } from '../models';
import { Duplex } from 'stream';

const log = {
  info: (...args: any[]) => console.log('[WebSocket]', ...args),
  error: (...args: any[]) => console.error('[WebSocket]', ...args)
};

export class WebSocketServer {
  private wss: WSServer;
  private connectionManager: ConnectionManager;
  private channelManager: ChannelManager;
  private messageHandler: MessageHandler;
  private config: WebSocketServerConfig;
  private isShuttingDown: boolean = false;

  constructor(server: any, config: WebSocketServerConfig) {
    this.wss = new WSServer({ noServer: true });
    this.config = config;
    this.connectionManager = new ConnectionManager();
    this.channelManager = new ChannelManager(this.connectionManager);
    this.messageHandler = new MessageHandler(this.connectionManager, this.channelManager);

    this.setupWebSocketServer();
    this.setupGracefulShutdown();
  }

  private setupGracefulShutdown() {
    const cleanup = () => {
      if (this.isShuttingDown) {
        log.info('Forced shutdown initiated');
        process.exit(1);
        return;
      }

      this.isShuttingDown = true;
      log.info('Starting graceful shutdown');

      // Force close all connections immediately
      const connections = this.connectionManager.getConnections();
      for (const connection of connections) {
        try {
          connection.socket.terminate(); // Use terminate instead of close for immediate effect
        } catch (error) {
          log.error('Error during connection cleanup:', { error });
        }
      }

      // Clear all managers immediately
      this.connectionManager.close();

      // Force close the server
      this.wss.close(() => {
        log.info('WebSocket server closed');
        // Force exit after 1 second if graceful shutdown fails
        setTimeout(() => {
          log.info('Forcing exit...');
          process.exit(0);
        }, 1000);
      });
    };

    // Handle different termination signals
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGHUP', cleanup);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      log.error('Uncaught exception:', { error });
      cleanup();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      log.error('Unhandled rejection:', { reason });
      cleanup();
    });
  }

  public handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit('connection', ws, request);
    });
  }

  private setupWebSocketServer() {
    this.wss.on('connection', async (socket: WebSocket, req: IncomingMessage) => {
      if (this.isShuttingDown) {
        socket.close(1001, 'Server is shutting down');
        return;
      }

      let userId: string | null = null;
      let username: string | null = null;

      const token = this.extractToken(req);
      if (!token) {
        log.error('Connection rejected - no token');
        socket.close(1008, 'No token provided');
        return;
      }

      try {
        userId = await verifyToken(token);
        if (!userId) {
          log.error('Connection rejected - invalid token');
          socket.close(1008, 'Invalid token');
          return;
        }

        const user = await User.findById(userId);
        if (!user) {
          log.error('Connection rejected - user not found', { userId });
          socket.close(1008, 'User not found');
          return;
        }

        username = user.username;
        let isAlive = true;
        const pingInterval = setInterval(() => {
          if (!isAlive) {
            log.info('Terminating inactive connection', { userId, username });
            socket.terminate();
            return;
          }
          isAlive = false;
          socket.ping();
        }, 30000);

        socket.on('pong', () => {
          isAlive = true;
        });

        const connection: WebSocketConnection = {
          socket,
          userId,
          username: user.username,
          channels: new Set(),
          lastSeen: new Date(),
          authenticated: true
        };

        // Add user to their channels
        const channels = await Channel.find({
          $or: [
            { members: userId },
            { isPrivate: false }
          ]
        }).populate('members', 'username avatar status');

        for (const channel of channels) {
          this.channelManager.addUserToChannel(connection, channel._id.toString());
        }

        this.connectionManager.addConnection(connection);
        log.info('Connection established', { userId, username });

        // Send initial messages
        socket.send(JSON.stringify({
          type: WebSocketMessageType.AUTH_SUCCESS,
          payload: { userId, username },
          timestamp: Date.now()
        }));

        // Send initial channel data
        socket.send(JSON.stringify({
          type: WebSocketMessageType.CHANNELS_LOADED,
          payload: {
            channels: channels.map(channel => ({
              _id: channel._id.toString(),
              name: channel.name,
              description: channel.description,
              isPrivate: channel.isPrivate,
              isDM: channel.isDM,
              members: channel.members.map((m: { _id: any; username: string; avatar?: string; status?: string }) => ({
                _id: m._id.toString(),
                username: m.username,
                avatar: m.avatar,
                status: m.status
              } as ChannelMember)),
              hasAccess: !channel.isPrivate || channel.members.some((m: { _id: any }) => m._id.toString() === userId)
            } as WSChannel))
          },
          timestamp: Date.now()
        }));

        // Send initial presence data
        const allConnections = this.connectionManager.getConnections();
        const presenceList = Array.from(allConnections).map(conn => ({
          userId: conn.userId,
          username: conn.username,
          status: 'online',
          lastSeen: conn.lastSeen
        }));

        socket.send(JSON.stringify({
          type: WebSocketMessageType.INITIAL_PRESENCE,
          payload: presenceList,
          timestamp: Date.now()
        }));

        // Send channel joined messages
        for (const channel of channels) {
          socket.send(JSON.stringify({
            type: WebSocketMessageType.CHANNEL_JOINED,
            payload: {
              channelId: channel._id.toString(),
              userId,
              username: user.username
            },
            timestamp: Date.now()
          }));
        }

        socket.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
          try {
            const message = JSON.parse(data.toString());

            // Handle PING messages immediately
            if (message.type === 'PING') {
              socket.send(JSON.stringify({
                type: 'PONG',
                timestamp: Date.now()
              }));
              return;
            }

            this.messageHandler.handleMessage(connection, message);
          } catch (error) {
            log.error('Message handling failed', { error, userId, username });
            socket.close(1011, 'Error handling message');
          }
        });

        socket.on('close', () => {
          clearInterval(pingInterval);
          log.info('Connection closed', { userId, username });

          // Cleanup connection
          this.connectionManager.removeConnection(connection);
          this.broadcastPresenceUpdate(connection, 'offline');
        });

        socket.on('error', (error) => {
          clearInterval(pingInterval);
          log.error('Socket error', { error, userId, username });
          this.connectionManager.removeConnection(connection);
        });

        // Broadcast initial presence
        this.broadcastPresenceUpdate(connection, 'online');

      } catch (error) {
        log.error('Connection setup failed', { error, userId, username });
        socket.close(1008, 'Authentication failed');
      }
    });
  }

  private extractToken(req: IncomingMessage): string | null {
    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      return token || null;
    } catch (error) {
      console.error('Error extracting token:', error);
      return null;
    }
  }

  public broadcast(message: string, filter?: (connection: WebSocketConnection) => boolean): void {
    const connections = this.connectionManager.getConnections();

    for (const connection of connections) {
      if (connection.socket.readyState === 1) { // 1 = OPEN
        if (!filter || filter(connection)) {
          try {
            connection.socket.send(message);
          } catch (error) {
            console.error('Error broadcasting message:', error);
          }
        }
      }
    }
  }

  public close() {
    this.isShuttingDown = true;
    this.connectionManager.close();
    this.wss.close();
  }

  private broadcastPresenceUpdate(connection: WebSocketConnection, status: 'online' | 'offline') {
    this.broadcast(JSON.stringify({
      type: WebSocketMessageType.PRESENCE_CHANGED,
      payload: {
        userId: connection.userId,
        username: connection.username,
        status,
        lastSeen: new Date().getTime()
      },
      timestamp: Date.now()
    }));
  }
}
