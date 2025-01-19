import { WebSocket } from 'ws';
import { Channel } from '../../models';
import { WebSocketMessageType } from '../../types/websocket.types';
import { WebSocketServer } from '../WebSocketServer';

interface ChannelHandlerOptions {
  wss: WebSocketServer;
  socket: WebSocket & { userId?: string; username?: string };
  connectionId: string;
}

export class ChannelHandler {
  private wss: WebSocketServer;
  private socket: WebSocket & { userId?: string; username?: string };
  private connectionId: string;

  constructor({ wss, socket, connectionId }: ChannelHandlerOptions) {
    this.wss = wss;
    this.socket = socket;
    this.connectionId = connectionId;
  }

  // Join a channel
  public async handleJoin(channelId: string): Promise<void> {
    try {
      const channel = await Channel.findById(channelId).lean();
      if (!channel) {
        throw new Error('Channel not found');
      }

      // Check if user has access
      const canJoin = !channel.isPrivate ||
        channel.members.some(memberId => memberId.toString() === this.socket.userId) ||
        channel.isDM;

      if (!canJoin) {
        throw new Error('Not authorized to join channel');
      }

      // Add user to channel members if not already a member
      if (!channel.members.some(memberId => memberId.toString() === this.socket.userId)) {
        await Channel.findByIdAndUpdate(channelId, {
          $addToSet: { members: this.socket.userId }
        });
      }

      // Add channel to connection's channels
      await this.wss.addToChannel(this.connectionId, channelId);

      // Notify channel members
      this.wss.broadcast(WebSocketMessageType.CHANNEL_JOINED, {
        channelId,
        userId: this.socket.userId,
        username: this.socket.username
      }, [channelId]);

      // If it's a DM, notify the other user
      if (channel.isDM) {
        const otherUserId = channel.members
          .find(memberId => memberId.toString() !== this.socket.userId)
          ?.toString();

        if (otherUserId) {
          this.wss.broadcast(WebSocketMessageType.CHANNEL_UPDATED, {
            channelId,
            type: 'dm_joined',
            userId: this.socket.userId
          }, [channelId]);
        }
      }
    } catch (error) {
      throw error;
    }
  }

  // Leave a channel
  public async handleLeave(channelId: string): Promise<void> {
    try {
      const channel = await Channel.findById(channelId).lean();
      if (!channel) {
        throw new Error('Channel not found');
      }

      // Remove user from channel members
      await Channel.findByIdAndUpdate(channelId, {
        $pull: { members: this.socket.userId }
      });

      // Remove channel from connection's channels
      await this.wss.removeFromChannel(this.connectionId, channelId);

      // Notify channel members
      this.wss.broadcast(WebSocketMessageType.CHANNEL_LEFT, {
        channelId,
        userId: this.socket.userId,
        username: this.socket.username
      }, [channelId]);
    } catch (error) {
      throw error;
    }
  }

  // Create a new channel
  public async handleCreate(data: {
    name: string;
    isPrivate: boolean;
    isDM: boolean;
    members?: string[];
  }): Promise<void> {
    try {
      // Validate channel name
      if (!data.isDM && (!data.name || data.name.length < 3)) {
        throw new Error('Invalid channel name');
      }

      // Create channel
      const channel = await Channel.create({
        name: data.name,
        isPrivate: data.isPrivate,
        isDM: data.isDM,
        members: [...(data.members || []), this.socket.userId],
        createdBy: this.socket.userId
      });

      // Add creator to channel
      await this.wss.addToChannel(this.connectionId, channel._id.toString());

      // Notify members
      const notifyMembers = data.members || [];
      this.wss.broadcast(WebSocketMessageType.CHANNEL_UPDATED, {
        channelId: channel._id.toString(),
        type: 'created',
        channel
      }, notifyMembers);
    } catch (error) {
      throw error;
    }
  }
}
