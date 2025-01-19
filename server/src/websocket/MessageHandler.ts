import { WebSocket } from 'ws';
import { ConnectionManager } from './ConnectionManager';
import { ChannelManager } from './ChannelManager';
import { WebSocketConnection } from './types';
import { WebSocketMessageType, WebSocketErrorType } from '../types/websocket.types';
import { Message } from '../models';
import { messageService } from '../services/message.service';
import Logger from '../utils/logger';

export class MessageHandler {
  private connectionManager: ConnectionManager;
  private channelManager: ChannelManager;

  constructor(connectionManager: ConnectionManager, channelManager: ChannelManager) {
    this.connectionManager = connectionManager;
    this.channelManager = channelManager;
  }

  public async handleMessage(connection: WebSocketConnection, message: any): Promise<void> {
    try {
      if (!message.type) {
        this.sendError(connection, {
          type: WebSocketErrorType.INVALID_MESSAGE,
          message: 'Message type is required'
        });
        return;
      }

      switch (message.type) {
        case WebSocketMessageType.MESSAGE:
          await this.handleChatMessage(connection, message.payload);
          break;
        case WebSocketMessageType.TYPING_START:
          await this.handleTypingStart(connection, message.payload);
          break;
        case WebSocketMessageType.TYPING_STOP:
          await this.handleTypingStop(connection, message.payload);
          break;
        case WebSocketMessageType.CHANNEL_JOIN:
          await this.handleChannelJoin(connection, message.payload);
          break;
        case WebSocketMessageType.CHANNEL_LEAVE:
          await this.handleChannelLeave(connection, message.payload);
          break;
        case WebSocketMessageType.CHANNEL_UPDATE:
          await this.handleChannelUpdate(connection, message.payload);
          break;
        case WebSocketMessageType.REACTION_ADD:
          await this.handleReactionAdd(connection, message.payload);
          break;
        case WebSocketMessageType.REACTION_REMOVE:
          await this.handleReactionRemove(connection, message.payload);
          break;
        case WebSocketMessageType.PRESENCE_UPDATE:
          await this.handlePresenceUpdate(connection, message.payload);
          break;
        default:
          this.sendError(connection, {
            type: WebSocketErrorType.INVALID_MESSAGE,
            message: 'Unknown message type',
            details: { receivedType: message.type }
          });
      }
    } catch (error: unknown) {
      Logger.error('Error handling message:', {
        context: 'MessageHandler',
        code: WebSocketErrorType.MESSAGE_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });

      this.sendError(connection, {
        type: WebSocketErrorType.MESSAGE_FAILED,
        message: 'Internal server error',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private sendError(connection: WebSocketConnection, error: { type: WebSocketErrorType; message: string; details?: any }): void {
    if (connection.socket.readyState === WebSocket.OPEN) {
      Logger.error(error.message, {
        context: 'MessageHandler',
        code: error.type,
        data: error.details
      });

      connection.socket.send(JSON.stringify({
        type: WebSocketMessageType.ERROR,
        payload: {
          code: error.type,
          message: error.message,
          details: error.details,
          timestamp: Date.now()
        }
      }));
    }
  }

  private async handleChatMessage(connection: WebSocketConnection, payload: any): Promise<void> {
    const { channelId, content } = payload;
    if (!channelId || !content) {
      this.sendError(connection, {
        type: WebSocketErrorType.INVALID_MESSAGE,
        message: 'Channel ID and content are required',
        details: { receivedPayload: payload }
      });
      return;
    }

    try {
      const message = await messageService.createMessage({
        content,
        channelId,
        senderId: connection.userId!
      });

      this.channelManager.broadcastToChannel(channelId, {
        type: WebSocketMessageType.MESSAGE,
        payload: message
      });
    } catch (error: unknown) {
      Logger.error('Error creating message:', {
        context: 'MessageHandler',
        code: WebSocketErrorType.MESSAGE_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });

      this.sendError(connection, {
        type: WebSocketErrorType.MESSAGE_FAILED,
        message: 'Failed to create message',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  private async handleTypingStart(connection: WebSocketConnection, payload: any): Promise<void> {
    const { channelId } = payload;
    if (!channelId) {
      this.sendError(connection, {
        type: WebSocketErrorType.INVALID_MESSAGE,
        message: 'Channel ID is required'
      });
      return;
    }

    this.channelManager.broadcastToChannel(channelId, {
      type: WebSocketMessageType.TYPING_START,
      payload: {
        channelId,
        userId: connection.userId,
        username: connection.username
      }
    });
  }

  private async handleTypingStop(connection: WebSocketConnection, payload: any): Promise<void> {
    const { channelId } = payload;
    if (!channelId) {
      this.sendError(connection, {
        type: WebSocketErrorType.INVALID_MESSAGE,
        message: 'Channel ID is required'
      });
      return;
    }

    this.channelManager.broadcastToChannel(channelId, {
      type: WebSocketMessageType.TYPING_STOP,
      payload: {
        channelId,
        userId: connection.userId,
        username: connection.username
      }
    });
  }

  private async handleChannelJoin(connection: WebSocketConnection, payload: any): Promise<void> {
    const { channelId } = payload;
    if (!channelId) {
      this.sendError(connection, {
        type: WebSocketErrorType.INVALID_MESSAGE,
        message: 'Channel ID is required'
      });
      return;
    }

    this.channelManager.addUserToChannel(connection, channelId);

    this.channelManager.broadcastToChannel(channelId, {
      type: WebSocketMessageType.CHANNEL_JOINED,
      payload: {
        channelId,
        userId: connection.userId,
        username: connection.username
      }
    });
  }

  private async handleChannelLeave(connection: WebSocketConnection, payload: any): Promise<void> {
    const { channelId } = payload;
    if (!channelId) {
      this.sendError(connection, {
        type: WebSocketErrorType.INVALID_MESSAGE,
        message: 'Channel ID is required'
      });
      return;
    }

    this.channelManager.broadcastToChannel(channelId, {
      type: WebSocketMessageType.CHANNEL_LEFT,
      payload: {
        channelId,
        userId: connection.userId
      }
    });

    this.channelManager.removeUserFromChannel(connection, channelId);
  }

  private async handleChannelUpdate(connection: WebSocketConnection, payload: any): Promise<void> {
    const { channelId, ...updates } = payload;
    if (!channelId) {
      this.sendError(connection, {
        type: WebSocketErrorType.INVALID_MESSAGE,
        message: 'Channel ID is required'
      });
      return;
    }

    this.channelManager.broadcastToChannel(channelId, {
      type: WebSocketMessageType.CHANNEL_UPDATED,
      payload: {
        channelId,
        ...updates
      }
    });
  }

  private async handleReactionAdd(connection: WebSocketConnection, payload: any): Promise<void> {
    const { messageId, channelId, emoji } = payload;
    if (!messageId || !channelId || !emoji) {
      this.sendError(connection, {
        type: WebSocketErrorType.INVALID_MESSAGE,
        message: 'Message ID, channel ID, and emoji are required'
      });
      return;
    }

    this.channelManager.broadcastToChannel(channelId, {
      type: WebSocketMessageType.REACTION_ADDED,
      payload: {
        messageId,
        channelId,
        emoji,
        userId: connection.userId
      }
    });
  }

  private async handleReactionRemove(connection: WebSocketConnection, payload: any): Promise<void> {
    const { messageId, channelId, emoji } = payload;
    if (!messageId || !channelId || !emoji) {
      this.sendError(connection, {
        type: WebSocketErrorType.INVALID_MESSAGE,
        message: 'Message ID, channel ID, and emoji are required'
      });
      return;
    }

    this.channelManager.broadcastToChannel(channelId, {
      type: WebSocketMessageType.REACTION_REMOVED,
      payload: {
        messageId,
        channelId,
        emoji,
        userId: connection.userId
      }
    });
  }

  private async handlePresenceUpdate(connection: WebSocketConnection, payload: any): Promise<void> {
    const { status } = payload;
    if (!status) {
      this.sendError(connection, {
        type: WebSocketErrorType.INVALID_MESSAGE,
        message: 'Status is required'
      });
      return;
    }

    // Update last seen
    this.connectionManager.updateLastSeen(connection);

    // Broadcast presence update to all connected users
    const connections = this.connectionManager.getConnections();
    const message = JSON.stringify({
      type: WebSocketMessageType.PRESENCE_CHANGED,
      payload: {
        userId: connection.userId,
        username: connection.username,
        status,
        lastSeen: connection.lastSeen
      },
      timestamp: Date.now()
    });

    for (const conn of connections) {
      if (conn.socket.readyState === WebSocket.OPEN) {
        try {
          conn.socket.send(message);
        } catch (error) {
          console.error('Error broadcasting presence update:', error);
        }
      }
    }
  }
}
