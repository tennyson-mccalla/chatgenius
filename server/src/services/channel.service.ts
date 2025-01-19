import mongoose from 'mongoose';
import { Channel } from '../models';
import { IUser } from '../models/types';
import { WebSocketErrorType } from '../types/websocket.types';
import Logger from '../utils/logger';

class ChannelError extends Error {
  details?: any;
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ChannelError';
    this.details = details;
  }
}

interface ChannelMember {
  _id: mongoose.Types.ObjectId;
  username: string;
  avatar?: string;
  status?: string;
}

interface CreateChannelParams {
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: string;
  members: string[];
}

class ChannelService {
  async getChannels(userId: string) {
    try {
      Logger.info('Fetching channels', {
        context: 'ChannelService',
        data: { userId }
      });

      const channels = await Channel.find({
        isDM: false,
        $or: [
          { isPrivate: false },
          { members: new mongoose.Types.ObjectId(userId) }
        ]
      })
      .populate('members', 'username avatar status')
      .sort({ lastMessage: -1 });

      // Add hasAccess flag
      return channels.map(channel => {
        const memberIds = channel.members.map((m: any) => m._id?.toString() || m.toString());
        const userIdString = userId.toString();
        const hasAccess = !channel.isPrivate || memberIds.includes(userIdString);

        return {
          ...channel.toObject(),
          hasAccess
        };
      });
    } catch (error) {
      Logger.error('Failed to fetch channels', {
        context: 'ChannelService',
        code: WebSocketErrorType.CHANNEL_ERROR,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new ChannelError('Failed to fetch channels', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async getDMChannels(userId: string) {
    try {
      Logger.info('Fetching DM channels', {
        context: 'ChannelService',
        data: { userId }
      });

      const channels = await Channel.find({
        isDM: true,
        members: new mongoose.Types.ObjectId(userId)
      })
      .populate('members', 'username avatar status')
      .sort({ lastMessage: -1 });

      return channels.map(channel => ({
        ...channel.toObject(),
        hasAccess: true
      }));
    } catch (error) {
      Logger.error('Failed to fetch DM channels', {
        context: 'ChannelService',
        code: WebSocketErrorType.CHANNEL_ERROR,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new ChannelError('Failed to fetch DM channels', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async createDMChannel(userId1: string, userId2: string) {
    try {
      Logger.info('Creating DM channel', {
        context: 'ChannelService',
        data: { userId1, userId2 }
      });

      // Check if DM channel already exists
      const existingChannel = await Channel.findOne({
        isDM: true,
        members: {
          $all: [
            new mongoose.Types.ObjectId(userId1),
            new mongoose.Types.ObjectId(userId2)
          ],
          $size: 2
        }
      }).populate('members', 'username avatar status');

      if (existingChannel) {
        Logger.info('Found existing DM channel', {
          context: 'ChannelService',
          data: { channelId: existingChannel._id }
        });
        return {
          ...existingChannel.toObject(),
          hasAccess: true
        };
      }

      // Create new DM channel
      const channel = await Channel.create({
        name: 'DM',
        isDM: true,
        isPrivate: true,
        members: [
          new mongoose.Types.ObjectId(userId1),
          new mongoose.Types.ObjectId(userId2)
        ]
      });

      const populatedChannel = await channel.populate('members', 'username avatar status');

      Logger.info('Created new DM channel', {
        context: 'ChannelService',
        data: { channelId: channel._id }
      });

      return {
        ...populatedChannel.toObject(),
        hasAccess: true
      };
    } catch (error) {
      Logger.error('Failed to create DM channel', {
        context: 'ChannelService',
        code: WebSocketErrorType.CHANNEL_ERROR,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new ChannelError('Failed to create DM channel', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async createChannel(params: CreateChannelParams) {
    try {
      const { name, description, isPrivate, createdBy, members } = params;

      Logger.info('Creating channel', {
        context: 'ChannelService',
        data: { name, isPrivate, createdBy, memberCount: members.length }
      });

      const memberIds = members.map(id => new mongoose.Types.ObjectId(id));

      // Always add creator to members if not already included
      if (!memberIds.some(id => id.toString() === createdBy)) {
        memberIds.push(new mongoose.Types.ObjectId(createdBy));
      }

      const channel = await Channel.create({
        name,
        description,
        isPrivate,
        isDM: false,
        members: memberIds,
        creator: new mongoose.Types.ObjectId(createdBy)
      });

      const populatedChannel = await channel.populate('members', 'username avatar status');

      Logger.info('Channel created successfully', {
        context: 'ChannelService',
        data: { channelId: channel._id }
      });

      return populatedChannel;
    } catch (error) {
      Logger.error('Failed to create channel', {
        context: 'ChannelService',
        code: WebSocketErrorType.CHANNEL_ERROR,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new ChannelError('Failed to create channel', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async getChannelById(channelId: string, userId: string) {
    try {
      Logger.info('Fetching channel by ID', {
        context: 'ChannelService',
        data: { channelId, userId }
      });

      const channel = await Channel.findById(channelId)
        .populate('members', 'username avatar status');

      if (!channel) {
        Logger.warn('Channel not found', {
          context: 'ChannelService',
          code: WebSocketErrorType.CHANNEL_ERROR,
          data: { channelId }
        });
        throw new ChannelError('Channel not found');
      }

      const memberIds = channel.members.map((m: any) => m._id?.toString() || m.toString());
      const userIdString = userId.toString();
      const hasAccess = !channel.isPrivate || memberIds.includes(userIdString);

      if (!hasAccess) {
        Logger.warn('Access denied to channel', {
          context: 'ChannelService',
          code: WebSocketErrorType.CHANNEL_ERROR,
          data: { channelId, userId }
        });
        throw new ChannelError('You do not have access to this channel');
      }

      return {
        ...channel.toObject(),
        hasAccess
      };
    } catch (error) {
      if (error instanceof ChannelError) {
        throw error;
      }
      Logger.error('Failed to fetch channel', {
        context: 'ChannelService',
        code: WebSocketErrorType.CHANNEL_ERROR,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new ChannelError('Failed to fetch channel', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async addMemberToChannel(channelId: string, userId: string, addedById: string) {
    try {
      Logger.info('Adding member to channel', {
        context: 'ChannelService',
        data: { channelId, userId, addedById }
      });

      const channel = await Channel.findById(channelId);
      if (!channel) {
        Logger.warn('Channel not found', {
          context: 'ChannelService',
          code: WebSocketErrorType.CHANNEL_ERROR,
          data: { channelId }
        });
        throw new ChannelError('Channel not found');
      }

      // Check if user adding has permission
      const adderIsMember = channel.members.some((m: mongoose.Types.ObjectId) => m.toString() === addedById);
      if (!adderIsMember) {
        Logger.warn('Permission denied - adder not a member', {
          context: 'ChannelService',
          code: WebSocketErrorType.CHANNEL_ERROR,
          data: { channelId, addedById }
        });
        throw new ChannelError('You do not have permission to add members to this channel');
      }

      // Check if user is already a member
      if (channel.members.some((m: mongoose.Types.ObjectId) => m.toString() === userId)) {
        Logger.warn('User already a member', {
          context: 'ChannelService',
          code: WebSocketErrorType.CHANNEL_ERROR,
          data: { channelId, userId }
        });
        throw new ChannelError('User is already a member of this channel');
      }

      channel.members.push(new mongoose.Types.ObjectId(userId));
      await channel.save();

      const populatedChannel = await channel.populate('members', 'username avatar status');

      Logger.info('Member added successfully', {
        context: 'ChannelService',
        data: { channelId, userId }
      });

      return populatedChannel;
    } catch (error) {
      if (error instanceof ChannelError) {
        throw error;
      }
      Logger.error('Failed to add member to channel', {
        context: 'ChannelService',
        code: WebSocketErrorType.CHANNEL_ERROR,
        data: error instanceof Error ? error.message : String(error)
      });
      throw new ChannelError('Failed to add member to channel', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// Export a singleton instance
export const channelService = new ChannelService();
