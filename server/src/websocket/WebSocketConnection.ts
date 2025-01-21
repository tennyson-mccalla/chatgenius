import { WebSocket, RawData } from 'ws';
import Logger from '../utils/logger';

export type ConnectionState = 'CONNECTING' | 'AUTHENTICATING' | 'AUTHENTICATED' | 'READY' | 'CLOSING' | 'CLOSED';

export class WebSocketConnection {
  private state: ConnectionState = 'CONNECTING';
  private readyTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Set<(data: any) => void> = new Set();
  private closeHandlers: Set<() => void> = new Set();
  private readyTimeoutDuration = 10000; // 10 seconds

  constructor(
    private socket: WebSocket,
    public readonly userId: string,
    public readonly username: string
  ) {
    this.setupMessageHandler();
    this.setupCloseHandler();
    this.setupErrorHandler();
    this.setupReadyTimeout();
    this.setState('AUTHENTICATING');
  }

  private setupMessageHandler(): void {
    this.socket.on('message', async (rawData: RawData) => {
      const startTime = Date.now();

      Logger.debug('Raw message received', {
        context: 'WebSocketConnection',
        data: {
          userId: this.userId,
          username: this.username,
          messageSize: rawData.length,
          state: this.state,
          timestamp: new Date().toISOString()
        }
      });

      try {
        const message = JSON.parse(rawData.toString());

        Logger.debug('Message parsed', {
          context: 'WebSocketConnection',
          data: {
            userId: this.userId,
            username: this.username,
            messageType: message.type,
            parseTime: Date.now() - startTime
          }
        });

        // Notify all message handlers
        this.messageHandlers.forEach(handler => handler(message));
      } catch (error) {
        Logger.error('Failed to parse message', {
          context: 'WebSocketConnection',
          data: {
            error: error instanceof Error ? error.message : String(error),
            userId: this.userId,
            username: this.username
          }
        });
      }
    });
  }

  private setupCloseHandler(): void {
    this.socket.on('close', (code: number, reason: Buffer) => {
      Logger.info('Connection closing', {
        context: 'WebSocketConnection',
        data: {
          userId: this.userId,
          username: this.username,
          code,
          reason: reason.toString()
        }
      });

      this.cleanup();
      this.setState('CLOSED');
      this.closeHandlers.forEach(handler => handler());
    });
  }

  private setupErrorHandler(): void {
    this.socket.on('error', (error: Error) => {
      Logger.error('Socket error', {
        context: 'WebSocketConnection',
        data: {
          error: error.message,
          userId: this.userId,
          username: this.username
        }
      });

      this.cleanup();
    });
  }

  private setupReadyTimeout(): void {
    this.readyTimeout = setTimeout(() => {
      if (this.state !== 'READY') {
        Logger.warn('Connection not ready within timeout', {
          context: 'WebSocketConnection',
          data: {
            userId: this.userId,
            username: this.username,
            state: this.state,
            timeoutDuration: this.readyTimeoutDuration
          }
        });
        this.close(1000, 'Connection timeout - not ready');
      }
    }, this.readyTimeoutDuration);
  }

  private setState(newState: ConnectionState): void {
    Logger.debug('Connection state change', {
      context: 'WebSocketConnection',
      data: {
        userId: this.userId,
        username: this.username,
        oldState: this.state,
        newState
      }
    });
    this.state = newState;
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public onMessage(handler: (data: any) => void): void {
    this.messageHandlers.add(handler);
  }

  public onClose(handler: () => void): void {
    this.closeHandlers.add(handler);
  }

  public send(data: any): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      Logger.warn('Attempted to send message on non-open socket', {
        context: 'WebSocketConnection',
        data: {
          userId: this.userId,
          username: this.username,
          socketState: this.socket.readyState,
          connectionState: this.state
        }
      });
    }
  }

  public markAuthenticated(): void {
    this.setState('AUTHENTICATED');
    this.send({ type: 'AUTH_SUCCESS' });
  }

  public markReady(): void {
    if (this.readyTimeout) {
      clearTimeout(this.readyTimeout);
      this.readyTimeout = null;
    }
    this.setState('READY');
    this.send({ type: 'READY_CONFIRMED' });
  }

  public close(code?: number, reason?: string): void {
    this.cleanup();
    this.socket.close(code, reason);
  }

  private cleanup(): void {
    if (this.readyTimeout) {
      clearTimeout(this.readyTimeout);
      this.readyTimeout = null;
    }
    this.messageHandlers.clear();
    this.closeHandlers.clear();
  }
}
