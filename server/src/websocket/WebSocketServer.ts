import { Server } from 'http';
import { WebSocket, WebSocketServer as WSServer } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { WebSocketConnection, WebSocketMessage, WebSocketMessageType } from '../types/websocket.types';
import { verifyToken } from '../utils/auth';
import Logger from '../utils/logger';

export class WebSocketServer {
  private wss: WSServer;
  private connections: Map<string, WebSocketConnection> = new Map();

  constructor(server: Server) {
    this.wss = new WSServer({ noServer: true });
    this.setupWebSocketServer(server);
  }

  private setupWebSocketServer(server: Server): void {
    server.on('upgrade', async (request: IncomingMessage, socket: Socket, head: Buffer) => {
      const { pathname, searchParams } = new URL(request.url!, `http://${request.headers.host}`);

      if (pathname !== '/ws') {
        socket.destroy();
        return;
      }

      const token = searchParams.get('token');
      if (!token) {
        Logger.warn('WebSocket connection attempt without token', {
          context: 'WebSocketServer',
          data: { pathname }
        });
        socket.destroy();
        return;
      }

      try {
        const user = await verifyToken(token);
        if (!user) {
          Logger.warn('Invalid token in WebSocket connection attempt', {
            context: 'WebSocketServer'
          });
          socket.destroy();
          return;
        }

        Logger.debug('Upgrading WebSocket connection', {
          context: 'WebSocketServer',
          data: {
            userId: user.id,
            pathname,
            hasToken: !!token
          }
        });

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.handleConnection(ws, user.id);
        });

      } catch (error) {
        Logger.error('Error during WebSocket authentication', {
          context: 'WebSocketServer',
          data: {
            error: error instanceof Error ? error.message : String(error)
          }
        });
        socket.destroy();
      }
    });
  }

  private handleConnection(ws: WebSocket, userId: string): void {
    Logger.debug('New WebSocket connection', {
      context: 'WebSocketServer',
      data: { userId }
    });

    // Create new connection instance
    const connection: WebSocketConnection = {
      socket: ws,
      userId,
      state: 'CONNECTING',
      ready: false,
      authenticated: false,
      timeout: null,
      username: '',  // Will be set when CLIENT_READY is received
      channels: new Set<string>(),  // Will be populated as user joins channels
      lastSeen: new Date()
    };

    // Set up message handling
    ws.on('message', async (rawData: Buffer) => {
      try {
        const messageStr = rawData.toString();
        const message = JSON.parse(messageStr) as WebSocketMessage;

        Logger.debug('Received WebSocket message', {
          context: 'WebSocketServer',
          data: {
            userId,
            type: message.type,
            messageSize: rawData.length,
            connectionState: connection.state,
            isAuthenticated: connection.authenticated,
            isReady: connection.ready
          }
        });

        // Handle AUTH message
        if (message.type === WebSocketMessageType.AUTH) {
          const authPayload = message.payload as { userId: string; username: string; token: string };
          connection.state = 'AUTHENTICATING';
          connection.authenticated = true;

          // Set username from message payload
          connection.username = authPayload.username;

          // Send AUTH_SUCCESS
          ws.send(JSON.stringify({
            type: WebSocketMessageType.AUTH_SUCCESS,
            payload: {
              userId,
              username: connection.username
            }
          }));

          Logger.info('Sent AUTH_SUCCESS', {
            context: 'WebSocketServer',
            data: {
              userId,
              username: connection.username,
              state: connection.state,
              authenticated: connection.authenticated
            }
          });
        }
        // Handle CLIENT_READY message
        else if (message.type === WebSocketMessageType.CLIENT_READY) {
          connection.state = 'AUTHENTICATED';
          connection.ready = true;

          // Send READY_CONFIRMED
          const response = {
            type: WebSocketMessageType.READY_CONFIRMED,
            payload: {
              userId,
              timestamp: new Date().toISOString()
            }
          };
          ws.send(JSON.stringify(response));

          Logger.info('Client marked as ready', {
            context: 'WebSocketServer',
            data: {
              userId,
              state: connection.state,
              ready: connection.ready
            }
          });
        }
      } catch (error) {
        Logger.error('Error handling WebSocket message', {
          context: 'WebSocketServer',
          data: {
            userId,
            error: error instanceof Error ? error.message : String(error),
            rawData: rawData.toString().slice(0, 200)
          }
        });
      }
    });

    // Store connection
    this.connections.set(userId, connection);

    // Handle connection closure
    ws.on('close', () => {
      this.connections.delete(userId);
      Logger.info('Connection removed', {
        context: 'WebSocketServer',
        data: {
          userId,
          remainingConnections: this.connections.size
        }
      });
    });

    Logger.info('Connection initialized', {
      context: 'WebSocketServer',
      data: {
        userId,
        state: connection.state,
        authenticated: connection.authenticated,
        ready: connection.ready
      }
    });
  }

  public shutdown(): void {
    // Close all connections
    for (const connection of this.connections.values()) {
      connection.socket.close(1000, 'Server shutting down');
    }

    // Clear connections map
    this.connections.clear();

    // Close the WebSocket server
    this.wss.close();
  }
}
