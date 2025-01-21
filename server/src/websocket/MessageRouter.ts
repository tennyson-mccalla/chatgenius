import { WebSocketConnection, WebSocketMessageType } from '../types/websocket.types';
import { ClientReadyHandler } from './handlers/ClientReadyHandler';
import { ChannelHandler } from './handlers/ChannelHandler';
import { PresenceHandler } from './handlers/PresenceHandler';
import Logger from '../utils/logger';

export class MessageRouter {
  constructor(
    private clientReadyHandler: ClientReadyHandler,
    private channelHandler: ChannelHandler,
    private presenceHandler: PresenceHandler
  ) {}

  public async routeMessage(
    connection: WebSocketConnection,
    message: { type: WebSocketMessageType; payload?: any }
  ): Promise<void> {
    const startTime = Date.now();

    try {
      Logger.debug('Routing message', {
        context: 'MessageRouter',
        data: {
          messageType: message.type,
          userId: connection.userId,
          username: connection.username,
          timestamp: new Date().toISOString()
        }
      });

      if (!message.type) {
        throw new Error('Message type is required');
      }

      switch (message.type) {
        case WebSocketMessageType.CLIENT_READY:
          await this.clientReadyHandler.handle(connection, message.payload);
          break;

        case WebSocketMessageType.CHANNEL_JOIN:
          await this.channelHandler.handleJoin(connection, message.payload);
          break;

        case WebSocketMessageType.CHANNEL_LEAVE:
          await this.channelHandler.handleLeave(connection, message.payload);
          break;

        case WebSocketMessageType.PRESENCE_UPDATE:
          await this.presenceHandler.handleUpdate(connection, message.payload);
          break;

        default:
          Logger.warn('Unknown message type', {
            context: 'MessageRouter',
            data: {
              type: message.type,
              userId: connection.userId,
              username: connection.username
            }
          });
      }

      const completionTime = Date.now();
      Logger.debug('Message routing complete', {
        context: 'MessageRouter',
        data: {
          messageType: message.type,
          processingTime: completionTime - startTime
        }
      });
    } catch (error) {
      Logger.error('Error routing message', {
        context: 'MessageRouter',
        data: {
          error: error instanceof Error ? error.message : String(error),
          messageType: message.type,
          userId: connection.userId,
          username: connection.username
        }
      });
      throw error; // Let the connection handler deal with the error
    }
  }
}
