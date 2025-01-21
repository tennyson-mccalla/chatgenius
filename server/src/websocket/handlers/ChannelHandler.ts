import { WebSocket } from 'ws';
import { WebSocketConnection, WebSocketMessageType } from '../../types/websocket.types';
import { ChannelManager } from '../ChannelManager';
import Logger from '../../utils/logger';

interface Channel {
  id: string;
  name: string;
  members: Set<string>;
}

export class ChannelHandler {
  private channels: Map<string, Channel> = new Map();
  private userChannels: Map<string, Set<string>> = new Map();

  constructor(private channelManager: ChannelManager) {}

  public async handleJoin(connection: WebSocketConnection, payload: any): Promise<void> {
    const startTime = Date.now();
    const { channelId } = payload;

    if (!channelId) {
      throw new Error('Channel ID is required');
    }

    Logger.debug('Handling channel join', {
      context: 'ChannelHandler',
      data: {
        channelId,
        userId: connection.userId,
        username: connection.username,
        timestamp: new Date().toISOString()
      }
    });

    // Add channel to connection's channel set
    connection.channels.add(channelId);

    // Get current channel members
    const channelMembers = await this.channelManager.getChannelMembers(channelId);

    // Send channel join confirmation
    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify({
        type: WebSocketMessageType.CHANNEL_JOINED,
        payload: {
          channelId,
          members: channelMembers
        },
        timestamp: Date.now()
      }));
    }

    // Broadcast join event to other channel members
    await this.channelManager.broadcastToChannel(channelId, JSON.stringify({
      type: WebSocketMessageType.MEMBER_JOINED,
      payload: {
        channelId,
        userId: connection.userId,
        username: connection.username
      },
      timestamp: Date.now()
    }), [connection]);

    const completionTime = Date.now();
    Logger.debug('Channel join complete', {
      context: 'ChannelHandler',
      data: {
        channelId,
        processingTime: completionTime - startTime,
        userId: connection.userId,
        username: connection.username
      }
    });
  }

  public async handleLeave(connection: WebSocketConnection, payload: any): Promise<void> {
    const startTime = Date.now();
    const { channelId } = payload;

    if (!channelId) {
      throw new Error('Channel ID is required');
    }

    Logger.debug('Handling channel leave', {
      context: 'ChannelHandler',
      data: {
        channelId,
        userId: connection.userId,
        username: connection.username,
        timestamp: new Date().toISOString()
      }
    });

    // Remove channel from connection's channel set
    connection.channels.delete(channelId);

    // Send channel leave confirmation
    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify({
        type: WebSocketMessageType.CHANNEL_LEFT,
        payload: { channelId },
        timestamp: Date.now()
      }));
    }

    // Broadcast leave event to other channel members
    await this.channelManager.broadcastToChannel(channelId, JSON.stringify({
      type: WebSocketMessageType.MEMBER_LEFT,
      payload: {
        channelId,
        userId: connection.userId,
        username: connection.username
      },
      timestamp: Date.now()
    }), [connection]);

    const completionTime = Date.now();
    Logger.debug('Channel leave complete', {
      context: 'ChannelHandler',
      data: {
        channelId,
        processingTime: completionTime - startTime,
        userId: connection.userId,
        username: connection.username
      }
    });
  }

  public async joinChannel(connection: WebSocketConnection, channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      Logger.warn('Attempted to join non-existent channel', {
        context: 'ChannelHandler',
        data: {
          userId: connection.userId,
          username: connection.username,
          channelId
        }
      });
      return;
    }

    channel.members.add(connection.userId);

    let userChannels = this.userChannels.get(connection.userId);
    if (!userChannels) {
      userChannels = new Set();
      this.userChannels.set(connection.userId, userChannels);
    }
    userChannels.add(channelId);

    Logger.debug('User joined channel', {
      context: 'ChannelHandler',
      data: {
        userId: connection.userId,
        username: connection.username,
        channelId,
        channelName: channel.name,
        memberCount: channel.members.size
      }
    });

    // Broadcast join event to channel members
    this.broadcastToChannel(channelId, {
      type: 'channel_member_join',
      payload: {
        userId: connection.userId,
        username: connection.username,
        channelId
      }
    });
  }

  public async leaveChannel(connection: WebSocketConnection, channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return;
    }

    channel.members.delete(connection.userId);

    const userChannels = this.userChannels.get(connection.userId);
    if (userChannels) {
      userChannels.delete(channelId);
    }

    Logger.debug('User left channel', {
      context: 'ChannelHandler',
      data: {
        userId: connection.userId,
        username: connection.username,
        channelId,
        channelName: channel.name,
        memberCount: channel.members.size
      }
    });

    // Broadcast leave event to channel members
    this.broadcastToChannel(channelId, {
      type: 'channel_member_leave',
      payload: {
        userId: connection.userId,
        username: connection.username,
        channelId
      }
    });
  }

  public async sendMessage(connection: WebSocketConnection, channelId: string, content: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return;
    }

    if (!channel.members.has(connection.userId)) {
      Logger.warn('Attempted to send message to channel user is not in', {
        context: 'ChannelHandler',
        data: {
          userId: connection.userId,
          username: connection.username,
          channelId,
          channelName: channel.name
        }
      });
      return;
    }

    const message = {
      type: 'channel_message',
      payload: {
        userId: connection.userId,
        username: connection.username,
        channelId,
        content,
        timestamp: new Date().toISOString()
      }
    };

    this.broadcastToChannel(channelId, message);
  }

  private broadcastToChannel(channelId: string, message: any): void {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return;
    }

    // In a real implementation, you would get the connections for each member
    // and send the message to each connected user
    Logger.debug('Broadcasting to channel', {
      context: 'ChannelHandler',
      data: {
        channelId,
        channelName: channel.name,
        messageType: message.type,
        recipientCount: channel.members.size
      }
    });
  }
}
