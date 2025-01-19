import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { ChatWebSocket } from '../lib/ChatWebSocket';
import { WebSocketMessageType, WebSocketMessage } from '../types/websocket.types';
import Logger from '../utils/logger';

interface WebSocketConfig {
  url: string;
  token?: string;
  userId?: string;
  username?: string;
  reconnect?: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    timeoutMs: number;
  };
}

interface WebSocketContextValue {
  socket: ChatWebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  sendMessage: <T = any>(type: WebSocketMessageType, payload?: T) => void;
  lastError: Error | null;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  config: WebSocketConfig;
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ config, children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const socketRef = useRef<ChatWebSocket | null>(null);

  const handleOpen = useCallback(() => {
    Logger.info('WebSocket connected', { context: 'WebSocketContext' });
    setIsConnected(true);
    setIsConnecting(false);
    setLastError(null);
  }, []);

  const handleClose = useCallback(() => {
    Logger.info('WebSocket closed', { context: 'WebSocketContext' });
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const handleError = useCallback((error: Event) => {
    const err = error instanceof Error ? error : new Error('WebSocket error');
    Logger.error('WebSocket error', { context: 'WebSocketContext', error: err });
    setLastError(err);
    setIsConnecting(false);
  }, []);

  const handleReconnecting = useCallback((attempt: number) => {
    Logger.info('WebSocket reconnecting', { context: 'WebSocketContext', attempt });
    setIsConnecting(true);
  }, []);

  const handleConnectionLost = useCallback(() => {
    Logger.warn('WebSocket connection lost', { context: 'WebSocketContext' });
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (socketRef.current?.hasConfigChanged(config)) {
      socketRef.current?.close();
      socketRef.current = null;
    }

    if (!socketRef.current) {
      setIsConnecting(true);
      socketRef.current = new ChatWebSocket({
        ...config,
        onOpen: handleOpen,
        onClose: handleClose,
        onError: handleError,
        onReconnecting: handleReconnecting,
        onConnectionLost: handleConnectionLost
      });
    }

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [config, handleOpen, handleClose, handleError, handleReconnecting, handleConnectionLost]);

  const sendMessage = useCallback(<T = any>(type: WebSocketMessageType, payload?: T) => {
    if (!socketRef.current) {
      Logger.warn('Cannot send message - socket not initialized', {
        context: 'WebSocketContext',
        data: { type }
      });
      return;
    }

    socketRef.current.send(type, payload);
  }, []);

  const contextValue = {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    sendMessage,
    lastError
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
