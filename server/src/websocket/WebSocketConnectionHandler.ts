import { WebSocket, RawData } from 'ws';
import { ConnectionManager } from './ConnectionManager';
import { MessageRouter } from './MessageRouter';
import { WebSocketConnection, WebSocketConnectionState } from '../types/websocket.types';
import Logger from '../utils/logger';

export class WebSocketConnectionHandler {
  constructor(
    private connectionManager: ConnectionManager,
    private messageRouter: MessageRouter
  ) {}

  public handleNewConnection(
    socket: WebSocket,
    userId: string,
    username: string
  ): WebSocketConnection {
    Logger.debug('Setting up new connection', {
      context: 'WebSocketConnectionHandler',
      data: { userId, username }
    });

    // First create and initialize the connection
    const connection = this.connectionManager.initializeConnection(socket, userId, username);

    // Set up message handling with the initialized connection
    this.setupMessageHandling(socket, connection);

    Logger.debug('Message handling setup complete', {
      context: 'WebSocketConnectionHandler',
      data: {
        userId: connection.userId,
        username: connection.username,
        readyState: socket.readyState,
        connectionState: connection.state
      }
    });

    // Send AUTH_SUCCESS after everything is set up
    this.connectionManager.sendAuthSuccess(connection);

    return connection;
  }

  private setupMessageHandling(socket: WebSocket, connection: WebSocketConnection): void {
    Logger.debug('Setting up message handling', {
      context: 'WebSocketConnectionHandler',
      data: {
        userId: connection.userId,
        username: connection.username,
        readyState: socket.readyState,
        connectionState: connection.state
      }
    });

    // Bind message handler directly
    const messageHandler = async (rawData: RawData) => {
      Logger.debug('TEST - Raw message handler called', {
        context: 'WebSocketConnectionHandler',
        data: {
          userId: connection.userId,
          username: connection.username,
          messageSize: rawData.length,
          timestamp: new Date().toISOString()
        }
      });

      const startTime = Date.now();
      const rawMessage = rawData.toString();

      Logger.debug('Raw WebSocket message received', {
        context: 'WebSocketConnectionHandler',
        data: {
          userId: connection.userId,
          username: connection.username,
          messageSize: rawData.length,
          rawMessage: rawMessage.slice(0, 200),
          timestamp: new Date().toISOString(),
          readyState: socket.readyState,
          connectionState: connection.state,
          isReady: connection.ready
        }
      });

      try {
        Logger.debug('Attempting to parse message', {
          context: 'WebSocketConnectionHandler',
          data: {
            userId: connection.userId,
            username: connection.username,
            messagePreview: rawMessage.slice(0, 200),
            parseTime: Date.now() - startTime
          }
        });

        let message;
        try {
          message = JSON.parse(rawMessage);
        } catch (parseError) {
          Logger.error('Failed to parse message as JSON', {
            context: 'WebSocketConnectionHandler',
            data: {
              error: parseError instanceof Error ? parseError.message : String(parseError),
              rawMessage: rawMessage.slice(0, 200),
              userId: connection.userId,
              username: connection.username
            }
          });
          return;
        }

        Logger.debug('Message parsed as JSON', {
          context: 'WebSocketConnectionHandler',
          data: {
            userId: connection.userId,
            username: connection.username,
            messageType: message.type,
            hasPayload: !!message.payload,
            parseTime: Date.now() - startTime,
            message
          }
        });

        try {
          Logger.debug('Routing message', {
            context: 'WebSocketConnectionHandler',
            data: {
              userId: connection.userId,
              username: connection.username,
              messageType: message.type,
              hasPayload: !!message.payload,
              routeStartTime: Date.now() - startTime,
              connectionState: connection.state,
              isReady: connection.ready
            }
          });

          await this.messageRouter.routeMessage(connection, message);

          Logger.debug('Message routing complete', {
            context: 'WebSocketConnectionHandler',
            data: {
              userId: connection.userId,
              username: connection.username,
              messageType: message.type,
              routeTime: Date.now() - startTime,
              connectionState: connection.state,
              isReady: connection.ready
            }
          });
        } catch (routeError) {
          Logger.error('Failed to route message', {
            context: 'WebSocketConnectionHandler',
            data: {
              error: routeError instanceof Error ? routeError.message : String(routeError),
              messageType: message.type,
              userId: connection.userId,
              username: connection.username,
              connectionState: connection.state,
              isReady: connection.ready,
              errorTime: Date.now() - startTime
            }
          });
          return;
        }
      } catch (error) {
        Logger.error('Error handling message', {
          context: 'WebSocketConnectionHandler',
          data: {
            userId: connection.userId,
            username: connection.username,
            error: error instanceof Error ? error.message : String(error),
            processingTime: Date.now() - startTime,
            rawData: rawData.toString().slice(0, 200)
          }
        });
      }
    };

    // Bind the handler with the correct context
    socket.on('message', messageHandler.bind(this));

    // Handle connection closure
    socket.on('close', (code: number, reason: string) => {
      Logger.info('Connection closed', {
        context: 'WebSocketConnectionHandler',
        data: {
          userId: connection.userId,
          username: connection.username,
          code,
          reason
        }
      });

      if (connection.timeout) {
        clearTimeout(connection.timeout);
        connection.timeout = null;
      }

      this.connectionManager.removeConnection(connection);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      Logger.error('Socket error', {
        context: 'WebSocketConnectionHandler',
        data: {
          error: error.message,
          userId: connection.userId,
          username: connection.username
        }
      });

      if (connection.timeout) {
        clearTimeout(connection.timeout);
        connection.timeout = null;
      }

      this.connectionManager.removeConnection(connection);
    });
  }
}
