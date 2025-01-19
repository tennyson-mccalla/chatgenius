import mongoose from 'mongoose';
import { Channel, Message, UnreadMessage, User } from '../models';
import { IMessage } from '../models/types';
import { WebSocketMessageType, WebSocketErrorType } from '../types/websocket.types';
import Logger from '../utils/logger';

class MessageError extends Error {
  details?: any;
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'MessageError';
    this.details = details;
  }
}

interface CreateMessageParams {
  content: string;
  channelId: string;
  senderId: string;
  parentMessageId?: string;
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
  }>;
}

interface MessageReaction {
  emoji: string;
  users: mongoose.Types.ObjectId[];
}

class MessageService {
  async createMessage(params: CreateMessageParams): Promise<IMessage> {
    try {
      Logger.info('Creating message', {
        context: 'MessageService',
        data: { channelId: params.channelId, senderId: params.senderId }
      });

      const { content, channelId, senderId, parentMessageId, attachments } = params;

      // Validate channel exists and user is a member
      const channel = await Channel.findById(channelId);
      if (!channel) {
        Logger.warn('Channel not found', {
          context: 'MessageService',
          code: WebSocketErrorType.MESSAGE_FAILED,
          data: { channelId }
        });
        throw new MessageError('Channel not found');
      }

      // Check if user is a member of the channel
      const memberIds = channel.members.map((m: mongoose.Types.ObjectId) => m.toString());
      if (!memberIds.includes(senderId)) {
        Logger.warn('User not member of channel', {
          context: 'MessageService',
          code: WebSocketErrorType.MESSAGE_FAILED,
          data: { channelId, senderId }
        });
        throw new MessageError('You do not have permission to send messages in this channel');
      }

      // Create message
      const message = await Message.create({
        content,
        channel: new mongoose.Types.ObjectId(channelId),
        sender: new mongoose.Types.ObjectId(senderId),
        parentMessage: parentMessageId ? new mongoose.Types.ObjectId(parentMessageId) : undefined,
        attachments
      });

      // Update channel's lastMessage timestamp
      channel.lastMessage = new Date();
      await channel.save();

      // Create unread messages for other channel members
      const unreadPromises = memberIds
        .filter((id: string) => id !== senderId)
        .map((userId: string) =>
          UnreadMessage.create({
            message: message._id,
            channel: channel._id,
            user: new mongoose.Types.ObjectId(userId)
          })
        );
      await Promise.all(unreadPromises);

      const populatedMessage = await message.populate(['sender', 'readBy']);

      Logger.info('Message created successfully', {
        context: 'MessageService',
        data: { messageId: message._id }
      });

      return populatedMessage;
    } catch (error) {
      if (error instanceof MessageError) {
        throw error;
      }
      Logger.error('Failed to create message', {
        context: 'MessageService',
        code: WebSocketErrorType.MESSAGE_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new MessageError('Failed to create message', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async getMessages(channelId: string, userId: string): Promise<IMessage[]> {
    try {
      Logger.info('Fetching messages', {
        context: 'MessageService',
        data: { channelId, userId }
      });

      // Validate channel exists and user is a member
      const channel = await Channel.findById(channelId);
      if (!channel) {
        Logger.warn('Channel not found', {
          context: 'MessageService',
          code: WebSocketErrorType.MESSAGE_FAILED,
          data: { channelId }
        });
        throw new MessageError('Channel not found');
      }

      // Check if user is a member of the channel
      const memberIds = channel.members.map((m: mongoose.Types.ObjectId) => m.toString());
      if (!memberIds.includes(userId)) {
        Logger.warn('User not member of channel', {
          context: 'MessageService',
          code: WebSocketErrorType.MESSAGE_FAILED,
          data: { channelId, userId }
        });
        throw new MessageError('You do not have permission to view messages in this channel');
      }

      const messages = await Message.find({ channel: new mongoose.Types.ObjectId(channelId) })
        .populate(['sender', 'readBy'])
        .populate('reactions.users', 'username')
        .sort({ createdAt: 1 });

      Logger.info('Messages fetched successfully', {
        context: 'MessageService',
        data: { channelId, messageCount: messages.length }
      });

      return messages.map(message => {
        const messageObj = message.toObject();
        if (messageObj.reactions) {
          messageObj.reactions = messageObj.reactions.map((reaction: any) => ({
            emoji: reaction.emoji,
            users: reaction.users.map((user: any) => user._id.toString())
          }));
        }
        return messageObj;
      });
    } catch (error) {
      if (error instanceof MessageError) {
        throw error;
      }
      Logger.error('Failed to fetch messages', {
        context: 'MessageService',
        code: WebSocketErrorType.MESSAGE_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new MessageError('Failed to fetch messages', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<IMessage> {
    try {
      Logger.info('Adding reaction', {
        context: 'MessageService',
        data: { messageId, userId, emoji }
      });

      const message = await Message.findById(messageId);
      if (!message) {
        Logger.warn('Message not found', {
          context: 'MessageService',
          code: WebSocketErrorType.MESSAGE_FAILED,
          data: { messageId }
        });
        throw new MessageError('Message not found');
      }

      // Initialize reactions array if it doesn't exist
      if (!message.reactions) {
        message.reactions = [];
      }

      // Find existing reaction with this emoji
      let reaction = message.reactions.find((r: MessageReaction) => r.emoji === emoji);
      if (!reaction) {
        // Create new reaction if it doesn't exist
        reaction = { emoji, users: [] };
        message.reactions.push(reaction);
      }

      // Add user to reaction if not already added
      if (!reaction.users.some((u: mongoose.Types.ObjectId) => u.toString() === userId)) {
        reaction.users.push(new mongoose.Types.ObjectId(userId));
        await message.save();
      }

      const populatedMessage = await message.populate(['sender', 'readBy', 'reactions.users']);

      Logger.info('Reaction added successfully', {
        context: 'MessageService',
        data: { messageId, emoji }
      });

      return populatedMessage;
    } catch (error) {
      if (error instanceof MessageError) {
        throw error;
      }
      Logger.error('Failed to add reaction', {
        context: 'MessageService',
        code: WebSocketErrorType.MESSAGE_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new MessageError('Failed to add reaction', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<IMessage> {
    try {
      Logger.info('Removing reaction', {
        context: 'MessageService',
        data: { messageId, userId, emoji }
      });

      const message = await Message.findById(messageId);
      if (!message) {
        Logger.warn('Message not found', {
          context: 'MessageService',
          code: WebSocketErrorType.MESSAGE_FAILED,
          data: { messageId }
        });
        throw new MessageError('Message not found');
      }

      // Find and update the reaction
      const reactionIndex = message.reactions?.findIndex((r: MessageReaction) => r.emoji === emoji);
      if (reactionIndex === -1 || !message.reactions) {
        Logger.warn('Reaction not found', {
          context: 'MessageService',
          code: WebSocketErrorType.MESSAGE_FAILED,
          data: { messageId, emoji }
        });
        throw new MessageError('Reaction not found');
      }

      // Remove user from reaction
      message.reactions[reactionIndex].users = message.reactions[reactionIndex].users
        .filter((u: mongoose.Types.ObjectId) => u.toString() !== userId);

      // Remove reaction entirely if no users left
      if (message.reactions[reactionIndex].users.length === 0) {
        message.reactions.splice(reactionIndex, 1);
      }

      await message.save();
      const populatedMessage = await message.populate(['sender', 'readBy', 'reactions.users']);

      Logger.info('Reaction removed successfully', {
        context: 'MessageService',
        data: { messageId, emoji }
      });

      return populatedMessage;
    } catch (error) {
      if (error instanceof MessageError) {
        throw error;
      }
      Logger.error('Failed to remove reaction', {
        context: 'MessageService',
        code: WebSocketErrorType.MESSAGE_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new MessageError('Failed to remove reaction', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async markChannelAsRead(channelId: string, userId: string): Promise<void> {
    try {
      Logger.info('Marking channel as read', {
        context: 'MessageService',
        data: { channelId, userId }
      });

      // Delete all unread messages for this user in this channel
      await UnreadMessage.deleteMany({
        channel: new mongoose.Types.ObjectId(channelId),
        user: new mongoose.Types.ObjectId(userId)
      });

      Logger.info('Channel marked as read successfully', {
        context: 'MessageService',
        data: { channelId, userId }
      });
    } catch (error) {
      Logger.error('Failed to mark channel as read', {
        context: 'MessageService',
        code: WebSocketErrorType.MESSAGE_FAILED,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new MessageError('Failed to mark channel as read', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export const messageService = new MessageService();
