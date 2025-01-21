import { WebSocket } from 'ws';
import { WebSocketConnection, WebSocketMessageType } from '../../types/websocket.types';
import { ConnectionManager } from '../ConnectionManager';
import Logger from '../../utils/logger';

export type UserStatus = 'online' | 'away' | 'offline';

interface UserPresence {
  userId: string;
  username: string;
  status: UserStatus;
  lastSeen: Date;
}

export class PresenceHandler {
  private userPresence: Map<string, UserPresence> = new Map();
  private connections: Map<string, WebSocketConnection> = new Map();

  constructor(private connectionManager: ConnectionManager) {}

  public addConnection(connection: WebSocketConnection): void {
    this.connections.set(connection.userId, connection);
    this.updatePresence(connection.userId, connection.username, 'online');
  }

  public removeConnection(connection: WebSocketConnection): void {
    this.connections.delete(connection.userId);
    this.updatePresence(connection.userId, connection.username, 'offline');
  }

  public updateStatus(connection: WebSocketConnection, status: UserStatus): void {
    this.updatePresence(connection.userId, connection.username, status);
  }

  private updatePresence(userId: string, username: string, status: UserStatus): void {
    const presence: UserPresence = {
      userId,
      username,
      status,
      lastSeen: new Date()
    };

    this.userPresence.set(userId, presence);

    Logger.debug('User presence updated', {
      context: 'PresenceHandler',
      data: {
        userId,
        username,
        status,
        timestamp: presence.lastSeen.toISOString()
      }
    });

    this.broadcastPresenceUpdate(presence);
  }

  public getOnlineUsers(): UserPresence[] {
    return Array.from(this.userPresence.values())
      .filter(presence => presence.status !== 'offline');
  }

  private broadcastPresenceUpdate(presence: UserPresence): void {
    const message = {
      type: 'presence_update',
      payload: {
        userId: presence.userId,
        username: presence.username,
        status: presence.status,
        timestamp: presence.lastSeen.toISOString()
      }
    };

    // Broadcast to all connected users
    for (const connection of this.connections.values()) {
      if (connection.getState() === 'READY') {
        connection.send(message);
      }
    }

    Logger.debug('Presence update broadcast', {
      context: 'PresenceHandler',
      data: {
        userId: presence.userId,
        username: presence.username,
        status: presence.status,
        recipientCount: this.connections.size
      }
    });
  }

  public sendInitialPresence(connection: WebSocketConnection): void {
    const onlineUsers = this.getOnlineUsers();

    connection.send({
      type: 'presence_list',
      payload: {
        users: onlineUsers.map(presence => ({
          userId: presence.userId,
          username: presence.username,
          status: presence.status,
          lastSeen: presence.lastSeen.toISOString()
        }))
      }
    });

    Logger.debug('Initial presence sent', {
      context: 'PresenceHandler',
      data: {
        userId: connection.userId,
        username: connection.username,
        onlineCount: onlineUsers.length
      }
    });
  }

  public async handleUpdate(connection: WebSocketConnection, payload: any): Promise<void> {
    const startTime = Date.now();
    const { status } = payload;

    Logger.debug('Handling presence update', {
      context: 'PresenceHandler',
      data: {
        userId: connection.userId,
        username: connection.username,
        status,
        timestamp: new Date().toISOString()
      }
    });

    // Update last seen timestamp
    connection.lastSeen = new Date();

    // Broadcast presence update to all connected clients
    const presenceUpdate = JSON.stringify({
      type: WebSocketMessageType.PRESENCE_CHANGED,
      payload: {
        userId: connection.userId,
        username: connection.username,
        status,
        lastSeen: connection.lastSeen
      },
      timestamp: Date.now()
    });

    const otherConnections = Array.from(this.connectionManager.getConnections())
      .filter(conn => conn.ready && conn.userId && conn !== connection);

    for (const conn of otherConnections) {
      if (conn.socket.readyState === WebSocket.OPEN) {
        conn.socket.send(presenceUpdate);
      }
    }

    const completionTime = Date.now();
    Logger.debug('Presence update complete', {
      context: 'PresenceHandler',
      data: {
        processingTime: completionTime - startTime,
        userId: connection.userId,
        username: connection.username,
        status
      }
    });
  }

  public async broadcastOffline(connection: WebSocketConnection): Promise<void> {
    const startTime = Date.now();

    Logger.debug('Broadcasting offline status', {
      context: 'PresenceHandler',
      data: {
        userId: connection.userId,
        username: connection.username,
        timestamp: new Date().toISOString()
      }
    });

    // Update last seen timestamp
    connection.lastSeen = new Date();

    // Broadcast offline status to all connected clients
    const presenceUpdate = JSON.stringify({
      type: WebSocketMessageType.PRESENCE_CHANGED,
      payload: {
        userId: connection.userId,
        username: connection.username,
        status: 'offline',
        lastSeen: connection.lastSeen
      },
      timestamp: Date.now()
    });

    const otherConnections = Array.from(this.connectionManager.getConnections())
      .filter(conn => conn.ready && conn.userId && conn !== connection);

    for (const conn of otherConnections) {
      if (conn.socket.readyState === WebSocket.OPEN) {
        conn.socket.send(presenceUpdate);
      }
    }

    const completionTime = Date.now();
    Logger.debug('Offline broadcast complete', {
      context: 'PresenceHandler',
      data: {
        processingTime: completionTime - startTime,
        userId: connection.userId,
        username: connection.username
      }
    });
  }
}
