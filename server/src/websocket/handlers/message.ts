import { WebSocket } from 'ws';
import { Message } from '../../models';
import { WebSocketMessageType, MessagePayload } from '../../types/websocket.types';
import { WebSocketServer } from '../WebSocketServer';
import { isAuthenticated } from '../middleware/auth';
import { WebSocketConnection } from '../types';
import { WebSocketErrorType } from '../../types/websocket.types';
import { ChannelManager } from '../ChannelManager';

interface MessageHandlerOptions {
  wss: WebSocketServer;
  socket: WebSocket & { userId?: string; username?: string };
  connectionId: string;
  channelManager: ChannelManager;
}

export class MessageHandler {
  private wss: WebSocketServer;
  private socket: WebSocket & { userId?: string; username?: string };
  private connectionId: string;
  private channelManager: ChannelManager;

  constructor({ wss, socket, connectionId, channelManager }: MessageHandlerOptions) {
    this.wss = wss;
    this.socket = socket;
    this.connectionId = connectionId;
    this.channelManager = channelManager;
  }

  // Validate message payload
  private validateMessage(payload: MessagePayload): string | null {
    if (!payload.content && (!payload.attachments || payload.attachments.length === 0)) {
      return 'Message must have content or attachments';
    }

    if (!payload.channelId) {
      return 'Channel ID is required';
    }

    if (payload.content && payload.content.length > 4000) {
      return 'Message content too long (max 4000 characters)';
    }

    if (payload.attachments && payload.attachments.length > 10) {
      return 'Too many attachments (max 10)';
    }

    return null;
  }

  // Handle new message
  public async handleMessage(payload: MessagePayload): Promise<void> {
    try {
      // Check authentication
      if (!isAuthenticated(this.socket)) {
        throw new Error('Not authenticated');
      }

      // Validate message
      const validationError = this.validateMessage(payload);
      if (validationError) {
        throw new Error(validationError);
      }

      // Create message
      const message = await Message.create({
        content: payload.content,
        channelId: payload.channelId,
        senderId: this.socket.userId,
        parentMessageId: payload.parentMessageId,
        attachments: payload.attachments
      });

      // Populate sender info
      await message.populate('senderId', 'username');

      // Broadcast to channel
      this.wss.broadcast(WebSocketMessageType.MESSAGE_RECEIVED, {
        ...message.toObject(),
        senderId: this.socket.userId,
        senderUsername: this.socket.username
      }, [payload.channelId]);

    } catch (error) {
      console.error('Error handling message:', error);
      throw error;
    }
  }

  // Handle message update
  public async handleUpdate(messageId: string, updates: {
    content?: string;
    attachments?: Array<{ url: string; type: string; name: string; }>;
  }): Promise<void> {
    try {
      // Check authentication
      if (!isAuthenticated(this.socket)) {
        throw new Error('Not authenticated');
      }

      // Find message
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Check ownership
      if (message.senderId.toString() !== this.socket.userId) {
        throw new Error('Not authorized to update message');
      }

      // Validate updates
      if (updates.content && updates.content.length > 4000) {
        throw new Error('Message content too long (max 4000 characters)');
      }

      if (updates.attachments && updates.attachments.length > 10) {
        throw new Error('Too many attachments (max 10)');
      }

      // Update message
      Object.assign(message, updates);
      await message.save();

      // Broadcast update
      this.wss.broadcast(WebSocketMessageType.MESSAGE_UPDATED, {
        messageId,
        updates,
        channelId: message.channelId
      }, [message.channelId.toString()]);

    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  // Handle message deletion
  public async handleDelete(messageId: string): Promise<void> {
    try {
      // Check authentication
      if (!isAuthenticated(this.socket)) {
        throw new Error('Not authenticated');
      }

      // Find message
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Check ownership
      if (message.senderId.toString() !== this.socket.userId) {
        throw new Error('Not authorized to delete message');
      }

      // Delete message
      await message.delete();

      // Broadcast deletion
      this.wss.broadcast(WebSocketMessageType.MESSAGE_DELETED, {
        messageId,
        channelId: message.channelId
      }, [message.channelId.toString()]);

    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  private sendError(connection: WebSocketConnection, error: { type: WebSocketErrorType; message: string }): void {
    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify({
        type: WebSocketMessageType.ERROR,
        payload: error,
        timestamp: Date.now()
      }));
    }
  }

  private async handleChatMessage(connection: WebSocketConnection, payload: any): Promise<void> {
    const { channelId, content } = payload;
    if (!channelId || !content) {
      this.sendError(connection, {
        type: WebSocketErrorType.INVALID_MESSAGE,
        message: 'Channel ID and content are required'
      });
      return;
    }

    try {
      // Create message in database
      const message = await Message.create({
        content,
        channel: channelId,
        sender: connection.userId,
        createdAt: new Date(),
        reactions: [] // Initialize empty reactions array
      });

      // Broadcast to channel
      const messageData = {
        type: WebSocketMessageType.MESSAGE_RECEIVED,
        payload: {
          channelId,
          message: {
            _id: message._id.toString(),
            content: message.content,
            sender: {
              _id: connection.userId,
              username: connection.username
            },
            channel: {
              _id: channelId
            },
            createdAt: message.createdAt.toISOString(),
            reactions: message.reactions || []
          }
        }
      };

      this.channelManager.broadcast(channelId, JSON.stringify(messageData));
    } catch (error) {
      console.error('Error handling chat message:', error);
      this.sendError(connection, {
        type: WebSocketErrorType.MESSAGE_FAILED,
        message: 'Failed to save message'
      });
    }
  }
}
