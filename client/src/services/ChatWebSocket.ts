import Logger from '../utils/logger';
import { WebSocketMessageType } from '../types/websocket.types';

interface WebSocketConfig {
  url: string;
  token: string;
  userId: string;
}

interface WebSocketCallbacks {
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Error) => void;
  onMessage?: (event: MessageEvent) => void;
  onReconnecting?: (attempt: number) => void;
}

export class ChatWebSocket {
  private socket: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private closeIntentional = false;

  // Callbacks
  private onOpenCallback?: () => void;
  private onCloseCallback?: (event: CloseEvent) => void;
  private onErrorCallback?: (error: Error) => void;
  private onMessageCallback?: (event: MessageEvent) => void;
  private onReconnectingCallback?: (attempt: number) => void;

  constructor(config: WebSocketConfig) {
    this.config = config;
    this.connect();
  }

  private connect() {
    try {
      Logger.debug('Starting WebSocket connection', {
        context: 'ChatWebSocket',
        data: {
          hasToken: !!this.config.token,
          hasUserId: !!this.config.userId,
          tokenPreview: this.config.token?.substring(0, 10) + '...',
          baseUrl: this.config.url
        }
      });

      // Construct URL with query parameters
      const url = new URL(this.config.url);
      // Ensure we have the /ws path
      if (!url.pathname.endsWith('/ws')) {
        url.pathname = '/ws';
      }
      // Add query parameters
      url.searchParams.set('token', this.config.token);
      url.searchParams.set('userId', this.config.userId);

      const fullUrl = url.toString();
      Logger.debug('WebSocket URL constructed', {
        context: 'ChatWebSocket',
        data: {
          url: fullUrl,
          path: url.pathname,
          params: Object.fromEntries(url.searchParams.entries())
        }
      });

      this.socket = new WebSocket(fullUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.closeIntentional = false;
        Logger.info('WebSocket connection opened', {
          context: 'ChatWebSocket',
          data: {
            userId: this.config.userId,
            readyState: this.socket?.readyState
          }
        });
        if (this.onOpenCallback) this.onOpenCallback();
      };

      this.socket.onclose = (event) => {
        Logger.info('WebSocket connection closed', {
          context: 'ChatWebSocket',
          data: {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            readyState: this.socket?.readyState
          }
        });
        if (this.onCloseCallback) this.onCloseCallback(event);
        if (!this.closeIntentional) {
          this.handleReconnect();
        }
      };

      this.socket.onerror = (event) => {
        const error = event instanceof Error ? event : new Error('WebSocket error');
        Logger.error('WebSocket connection error', {
          context: 'ChatWebSocket',
          data: {
            message: error.message,
            readyState: this.socket?.readyState
          }
        });
        if (this.onErrorCallback) this.onErrorCallback(error);
      };

      this.socket.onmessage = (event) => {
        if (this.onMessageCallback) this.onMessageCallback(event);
      };
    } catch (error) {
      const wsError = error instanceof Error ? error : new Error('WebSocket connection failed');
      Logger.error('WebSocket connection setup failed', {
        context: 'ChatWebSocket',
        data: {
          error: wsError.message,
          stack: wsError.stack
        }
      });
      if (this.onErrorCallback) this.onErrorCallback(wsError);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      Logger.info('Attempting WebSocket reconnection', {
        context: 'ChatWebSocket',
        data: {
          attempt: this.reconnectAttempts,
          maxAttempts: this.maxReconnectAttempts,
          userId: this.config.userId,
          nextDelay: Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
        }
      });
      if (this.onReconnectingCallback) {
        this.onReconnectingCallback(this.reconnectAttempts);
      }
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.reconnectTimeout = setTimeout(() => this.connect(), delay);
    } else {
      Logger.error('Max WebSocket reconnection attempts reached', {
        context: 'ChatWebSocket',
        data: {
          attempts: this.reconnectAttempts,
          userId: this.config.userId
        }
      });
    }
  }

  public hasConfigChanged(newConfig: WebSocketConfig): boolean {
    return (
      this.config.url !== newConfig.url ||
      this.config.token !== newConfig.token ||
      this.config.userId !== newConfig.userId
    );
  }

  public close() {
    this.closeIntentional = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
    }
  }

  public send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      Logger.debug('Sending WebSocket message', {
        context: 'ChatWebSocket',
        data: {
          type: data.type,
          readyState: this.socket.readyState,
          hasPayload: !!data.payload,
          userId: this.config.userId
        }
      });
      this.socket.send(JSON.stringify(data));
    } else {
      Logger.warn('Failed to send message - socket not ready', {
        context: 'ChatWebSocket',
        data: {
          type: data.type,
          readyState: this.socket?.readyState,
          isSocketNull: !this.socket,
          userId: this.config.userId,
          reconnectAttempts: this.reconnectAttempts
        }
      });
    }
  }

  // Event handlers
  public onOpen(callback: () => void) {
    this.onOpenCallback = callback;
  }

  public onClose(callback: (event: CloseEvent) => void) {
    this.onCloseCallback = callback;
  }

  public onError(callback: (error: Error) => void) {
    this.onErrorCallback = callback;
  }

  public onMessage(callback: (event: MessageEvent) => void) {
    this.onMessageCallback = callback;
  }

  public onReconnecting(callback: (attempt: number) => void) {
    this.onReconnectingCallback = callback;
  }

  public updateMessageHandler(handler: ((event: MessageEvent) => void) | undefined) {
    this.onMessageCallback = handler;
  }
}
