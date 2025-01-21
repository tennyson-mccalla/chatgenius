import { ConnectionManager } from './ConnectionManager';
import { WebSocketConnection } from './types';
import { WebSocketMessageType } from '../types/websocket.types';
import { Channel } from '../models';

export class ChannelManager {
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }

  public addUserToChannel(connection: WebSocketConnection, channelId: string): void {
    this.connectionManager.addChannelToConnection(connection, channelId);
  }

  public removeUserFromChannel(connection: WebSocketConnection, channelId: string): void {
    this.connectionManager.removeChannelFromConnection(connection, channelId);
  }

  public broadcastToChannel(channelId: string, message: any): void {
    const connections = this.connectionManager.getConnectionsByChannel(channelId);
    const messageStr = JSON.stringify({
      type: message.type || WebSocketMessageType.MESSAGE,
      payload: message.payload,
      timestamp: Date.now()
    });

    for (const connection of connections) {
      if (connection.socket.readyState === WebSocket.OPEN) {
        try {
          connection.socket.send(messageStr);
        } catch (error) {
          console.error('Error broadcasting to channel:', error);
        }
      }
    }
  }

  public getChannelConnections(channelId: string): WebSocketConnection[] {
    return this.connectionManager.getConnectionsByChannel(channelId);
  }

  public getUserChannels(userId: string): Set<string> {
    const userConnections = this.connectionManager.getConnectionsByUserId(userId);
    const channels = new Set<string>();

    for (const connection of userConnections) {
      for (const channelId of connection.channels) {
        channels.add(channelId);
      }
    }

    return channels;
  }

  public async getChannelsForUser(userId: string): Promise<any[]> {
    try {
      // Find all channels where the user is a member
      const channels = await Channel.find({
        $or: [
          { members: userId },
          { isDM: true, members: userId }
        ]
      }).populate('members', '_id username');

      return channels.map(channel => ({
        _id: channel._id,
        name: channel.name,
        isDM: channel.isDM,
        members: channel.members,
        lastMessage: channel.lastMessage,
        createdAt: channel.createdAt,
        updatedAt: channel.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching channels for user:', error);
      return [];
    }
  }
}
