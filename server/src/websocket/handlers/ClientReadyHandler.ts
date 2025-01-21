import { WebSocket } from 'ws';
import { WebSocketConnection, WebSocketMessageType } from '../../types/websocket.types';
import { ConnectionManager } from '../ConnectionManager';
import Logger from '../../utils/logger';

export class ClientReadyHandler {
  constructor(private connectionManager: ConnectionManager) {}

  public async handle(connection: WebSocketConnection, payload: any): Promise<void> {
    const startTime = Date.now();
    Logger.debug('Handling CLIENT_READY message', {
      context: 'ClientReadyHandler',
      data: {
        userId: connection.userId,
        username: connection.username,
        readyState: connection.socket.readyState,
        timestamp: new Date().toISOString(),
        payload
      }
    });

    // Validate payload
    if (!payload || payload.userId !== connection.userId || payload.username !== connection.username) {
      throw new Error('Invalid CLIENT_READY payload');
    }

    // Clear the ready timeout
    if (connection.timeout) {
      clearTimeout(connection.timeout);
      connection.timeout = null;
    }

    // Mark the connection as ready
    connection.ready = true;
    connection.lastSeen = new Date();

    // Get list of online users (excluding self)
    const onlineUsers = Array.from(this.connectionManager.getConnections())
      .filter(conn => conn.ready && conn.userId && conn !== connection)
      .map(conn => ({
        userId: conn.userId!,
        username: conn.username!,
        status: 'online',
        lastSeen: conn.lastSeen
      }));

    // Send READY_CONFIRMED and initial presence list
    if (connection.socket.readyState === WebSocket.OPEN) {
      // Send READY_CONFIRMED
      connection.socket.send(JSON.stringify({
        type: WebSocketMessageType.READY_CONFIRMED,
        payload: {
          userId: connection.userId,
          username: connection.username
        },
        timestamp: Date.now()
      }));

      // Send initial presence list
      connection.socket.send(JSON.stringify({
        type: WebSocketMessageType.INITIAL_PRESENCE,
        payload: onlineUsers,
        timestamp: Date.now()
      }));
    }

    // Broadcast presence update to other connections
    const otherConnections = Array.from(this.connectionManager.getConnections())
      .filter(conn => conn.ready && conn.userId && conn !== connection);

    const presenceUpdate = JSON.stringify({
      type: WebSocketMessageType.PRESENCE_CHANGED,
      payload: {
        userId: connection.userId,
        username: connection.username,
        status: 'online',
        lastSeen: connection.lastSeen
      },
      timestamp: Date.now()
    });

    for (const conn of otherConnections) {
      if (conn.socket.readyState === WebSocket.OPEN) {
        conn.socket.send(presenceUpdate);
      }
    }

    const completionTime = Date.now();
    Logger.debug('CLIENT_READY handling complete', {
      context: 'ClientReadyHandler',
      data: {
        processingTime: completionTime - startTime,
        userId: connection.userId,
        username: connection.username
      }
    });
  }
}
