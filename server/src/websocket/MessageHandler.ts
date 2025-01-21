import { WebSocket } from 'ws';
import { WebSocketMessageType, WebSocketConnection, ClientReadyPayload, ChannelJoinPayload, ChannelLeavePayload, ChannelMessagePayload, ReactionPayload } from '../types/websocket.types';
import { ConnectionManager } from './ConnectionManager';
import { ChannelManager } from './ChannelManager';
import Logger from '../utils/logger';

export class MessageHandler {
  constructor(
    private connectionManager: ConnectionManager,
    private channelManager: ChannelManager
  ) {}

  public async handleMessage(connection: WebSocketConnection, message: any): Promise<void> {
    const startTime = Date.now();

    try {
      Logger.debug('Processing message', {
        context: 'MessageHandler',
        data: {
          type: message.type,
          userId: connection.userId,
          username: connection.username,
          state: connection.state,
          isReady: connection.ready
        }
      });

      switch (message.type) {
        case WebSocketMessageType.CLIENT_READY:
          await this.handleClientReady(connection, message.payload);
          break;
        case WebSocketMessageType.CHANNEL_JOIN:
          await this.handleChannelJoin(connection, message.payload);
          break;
        case WebSocketMessageType.CHANNEL_LEAVE:
          await this.handleChannelLeave(connection, message.payload);
          break;
        case WebSocketMessageType.MESSAGE:
          await this.handleChannelMessage(connection, message.payload);
          break;
        case WebSocketMessageType.REACTION_ADD:
          await this.handleReactionAdd(connection, message.payload);
          break;
        case WebSocketMessageType.REACTION_REMOVE:
          await this.handleReactionRemove(connection, message.payload);
          break;
        default:
          Logger.warn('Unknown message type', {
            context: 'MessageHandler',
            data: {
              type: message.type,
              userId: connection.userId,
              username: connection.username,
              state: connection.state
            }
          });
      }

      const completionTime = Date.now();
      Logger.debug('Message handling complete', {
        context: 'MessageHandler',
        data: {
          type: message.type,
          userId: connection.userId,
          username: connection.username,
          state: connection.state,
          processingTime: completionTime - startTime
        }
      });
    } catch (error) {
      Logger.error('Failed to handle message', {
        context: 'MessageHandler',
        data: {
          error: error instanceof Error ? error.message : String(error),
          type: message.type,
          userId: connection.userId,
          username: connection.username,
          state: connection.state
        }
      });

      // Send error message to client
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(JSON.stringify({
          type: WebSocketMessageType.ERROR,
          payload: {
            message: error instanceof Error ? error.message : 'Failed to process message',
            originalType: message.type
          }
        }));
      }
    }
  }

  private async handleClientReady(connection: WebSocketConnection, payload: ClientReadyPayload): Promise<void> {
    Logger.debug('Processing CLIENT_READY message', {
      context: 'MessageHandler',
      data: {
        userId: connection.userId,
        username: connection.username,
        state: connection.state,
        isReady: connection.ready
      }
    });

    // Mark the connection as ready in the connection manager
    this.connectionManager.handleClientReady(connection);

    // Send initial presence information
    const allConnections = this.connectionManager.getConnections();
    const presenceList = Array.from(allConnections)
      .filter(conn => conn.ready)
      .map(conn => ({
        userId: conn.userId,
        username: conn.username,
        status: 'online',
        lastSeen: conn.lastSeen.toISOString()
      }));

    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify({
        type: WebSocketMessageType.INITIAL_PRESENCE,
        payload: {
          users: presenceList
        },
        timestamp: Date.now()
      }));
    }

    Logger.info('Connection marked as ready', {
      context: 'MessageHandler',
      data: {
        userId: connection.userId,
        username: connection.username,
        state: connection.state,
        isReady: connection.ready
      }
    });
  }

  private async handleChannelJoin(connection: WebSocketConnection, payload: ChannelJoinPayload): Promise<void> {
    if (!connection.ready) {
      throw new Error('Connection not ready');
    }

    const { channelId } = payload;
    if (!channelId) {
      throw new Error('Channel ID is required');
    }

    await this.channelManager.addUserToChannel(connection, channelId);
  }

  private async handleChannelLeave(connection: WebSocketConnection, payload: ChannelLeavePayload): Promise<void> {
    if (!connection.ready) {
      throw new Error('Connection not ready');
    }

    const { channelId } = payload;
    if (!channelId) {
      throw new Error('Channel ID is required');
    }

    await this.channelManager.removeUserFromChannel(connection, channelId);
  }

  private async handleChannelMessage(connection: WebSocketConnection, payload: ChannelMessagePayload): Promise<void> {
    if (!connection.ready) {
      throw new Error('Connection not ready');
    }

    const { channelId, content } = payload;
    if (!channelId || !content) {
      throw new Error('Channel ID and content are required');
    }

    await this.channelManager.broadcastToChannel(channelId, {
      type: WebSocketMessageType.MESSAGE,
      payload: {
        channelId,
        content,
        userId: connection.userId,
        username: connection.username,
        timestamp: new Date().toISOString()
      }
    });
  }

  private async handleReactionAdd(connection: WebSocketConnection, payload: ReactionPayload): Promise<void> {
    if (!connection.ready) {
      throw new Error('Connection not ready');
    }

    const { messageId, emoji, channelId } = payload;
    if (!messageId || !emoji || !channelId) {
      throw new Error('Message ID, emoji, and channel ID are required');
    }

    await this.channelManager.broadcastToChannel(channelId, {
      type: WebSocketMessageType.REACTION_ADDED,
      payload: {
        messageId,
        emoji,
        userId: connection.userId,
        channelId
      }
    });
  }

  private async handleReactionRemove(connection: WebSocketConnection, payload: ReactionPayload): Promise<void> {
    if (!connection.ready) {
      throw new Error('Connection not ready');
    }

    const { messageId, emoji, channelId } = payload;
    if (!messageId || !emoji || !channelId) {
      throw new Error('Message ID, emoji, and channel ID are required');
    }

    await this.channelManager.broadcastToChannel(channelId, {
      type: WebSocketMessageType.REACTION_REMOVED,
      payload: {
        messageId,
        emoji,
        userId: connection.userId,
        channelId
      }
    });
  }
}
