import { WebSocket } from 'ws';
import { WebSocketConnection } from './types';

export class ConnectionManager {
  private connections: Set<WebSocketConnection>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.connections = new Set();
    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    // Check for stale connections every minute
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      for (const connection of this.connections) {
        // If last seen more than 2 minutes ago and socket is not OPEN
        if (now.getTime() - connection.lastSeen.getTime() > 120000 &&
            connection.socket.readyState !== WebSocket.OPEN) {
          console.log('Cleaning up stale connection:', {
            userId: connection.userId,
            username: connection.username,
            lastSeen: connection.lastSeen
          });
          this.removeConnection(connection);
        }
      }
    }, 60000);
  }

  public addConnection(connection: WebSocketConnection): void {
    // Remove any existing connections for this user
    const existingConnections = this.getConnectionsByUserId(connection.userId);
    for (const existingConn of existingConnections) {
      if (existingConn.socket.readyState !== WebSocket.OPEN) {
        this.removeConnection(existingConn);
      }
    }
    this.connections.add(connection);
  }

  public removeConnection(connection: WebSocketConnection): void {
    try {
      // Force terminate instead of graceful close
      connection.socket.terminate();
    } catch (error) {
      console.error('Error terminating connection:', error);
    }
    this.connections.delete(connection);
  }

  public getConnections(): Set<WebSocketConnection> {
    return this.connections;
  }

  public getConnectionsByUserId(userId: string): WebSocketConnection[] {
    return Array.from(this.connections).filter(conn => conn.userId === userId);
  }

  public getConnectionsByChannel(channelId: string): WebSocketConnection[] {
    return Array.from(this.connections).filter(conn => conn.channels.has(channelId));
  }

  public addChannelToConnection(connection: WebSocketConnection, channelId: string): void {
    connection.channels.add(channelId);
  }

  public removeChannelFromConnection(connection: WebSocketConnection, channelId: string): void {
    connection.channels.delete(channelId);
  }

  public updateLastSeen(connection: WebSocketConnection): void {
    connection.lastSeen = new Date();
  }

  public close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Force terminate all connections
    for (const connection of this.connections) {
      try {
        // Force terminate instead of graceful close
        connection.socket.terminate();
      } catch (error) {
        console.error('Error terminating connection:', error);
      }
    }

    // Clear all connections immediately
    this.connections.clear();
  }
}
