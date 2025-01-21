import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ChatWebSocket } from '../lib/ChatWebSocket';
import { WebSocketMessageType } from '../types/websocket.types';
import Logger from '../utils/logger';
import { handleInitialPresence, handleUserPresence } from '../store/socketHandlers/presenceHandlers';
import { handleMessageReceived, handleReaction } from '../store/socketHandlers/messageHandlers';
import { useAuth } from '../store/authStore';

// Ensure the WebSocket URL includes the /ws path
const WS_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws').replace(/\/+$/, '') + '/ws';

interface WebSocketContextValue {
  socket: ChatWebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  lastError: Error | null;
  sendMessage: (type: WebSocketMessageType, payload: any) => void;
  isReady: boolean;
  socketState: {
    connected: boolean;
    ready: boolean;
    error: Error | null;
  };
}

const WebSocketContext = createContext<WebSocketContextValue>({
  socket: null,
  isConnected: false,
  isConnecting: false,
  lastError: null,
  sendMessage: () => {},
  isReady: false,
  socketState: {
    connected: false,
    ready: false,
    error: null
  }
});

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<ChatWebSocket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingTimestamp, setConnectingTimestamp] = useState<number | null>(null);
  const socketRef = useRef<ChatWebSocket | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(false);
  const [config, setConfig] = useState(() => ({
    token: localStorage.getItem('token'),
    userId: localStorage.getItem('userId')
  }));

  // Track socket state
  const [socketState, setSocketState] = useState({
    connected: false,
    ready: false,
    error: null as Error | null
  });

  useEffect(() => {
    if (!mountedRef.current) return;

    Logger.debug('Socket state updated', {
      context: 'WebSocketContext',
      data: {
        socketState,
        userId: user?._id,
        timestamp: new Date().toISOString()
      }
    });
  }, [socketState, user?._id]);

  // Watch for localStorage changes
  useEffect(() => {
    const checkConfig = () => {
      const newToken = localStorage.getItem('token');
      const newUserId = localStorage.getItem('userId');

      if (newToken !== config.token || newUserId !== config.userId) {
        Logger.debug('Auth config changed', {
          context: 'WebSocketContext',
          data: {
            hasOldToken: !!config.token,
            hasNewToken: !!newToken,
            oldUserId: config.userId,
            newUserId
          }
        });
        setConfig({ token: newToken, userId: newUserId });
      }
    };

    // Check immediately
    checkConfig();

    // Set up interval to check for changes
    const interval = setInterval(checkConfig, 1000);

    return () => clearInterval(interval);
  }, [config.token, config.userId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const { token, userId } = config;

    if (!token || !userId) {
      Logger.debug('Missing connection requirements', {
        context: 'WebSocketContext',
        data: { hasToken: !!token, hasUserId: !!userId }
      });
      return;
    }

    // Check if we already have a valid socket
    if (socketRef.current && socketRef.current.socket?.readyState === WebSocket.OPEN) {
      const currentConfig = {
        url: WS_URL,
        token,
        userId
      };

      if (!socketRef.current.hasConfigChanged(currentConfig)) {
        Logger.debug('Valid socket connection exists, skipping reconnection', {
          context: 'WebSocketContext',
          data: {
            userId,
            readyState: socketRef.current.socket.readyState,
            isConnected: socketState.connected,
            isReady: socketState.ready
          }
        });
        return;
      }
    }

    if (isConnecting) {
      // Prevent duplicate connections within 5 seconds
      if (connectingTimestamp && Date.now() - connectingTimestamp < 5000) {
        Logger.debug('Connection attempt too soon after previous attempt', {
          context: 'WebSocketContext',
          data: {
            userId,
            timeSinceLastAttempt: connectingTimestamp ? Date.now() - connectingTimestamp : null
          }
        });
        return;
      }
      Logger.debug('Previous connection attempt timed out, allowing new attempt', {
        context: 'WebSocketContext',
        data: { userId }
      });
    }

    const initializeSocket = () => {
      setIsConnecting(true);
      setConnectingTimestamp(Date.now());

      Logger.debug('Initializing new WebSocket connection', {
        context: 'WebSocketContext',
        data: {
          hasToken: !!token,
          userId,
          tokenPreview: token?.substring(0, 10) + '...',
          wsUrl: WS_URL,
          isConnecting,
          hasExistingSocket: !!socketRef.current
        }
      });

      const ws = new ChatWebSocket({
        url: WS_URL,
        token,
        userId,
        username: user?.username,
        onStateChange: (state) => {
          if (!mountedRef.current) return;
          setSocketState(state);
        },
        onOpen: () => {
          if (!mountedRef.current) return;
          Logger.info('WebSocket connected', {
            context: 'WebSocketContext',
            data: {
              userId,
              wsUrl: WS_URL,
              readyState: ws.socket?.readyState
            }
          });
          setIsConnecting(false);
        },
        onClose: (event: CloseEvent) => {
          if (!mountedRef.current) return;
          Logger.info('WebSocket closed', {
            context: 'WebSocketContext',
            data: {
              userId,
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
              readyState: ws.socket?.readyState
            }
          });
          setIsConnecting(false);
        },
        onError: (event: Event) => {
          if (!mountedRef.current) return;
          const error = event instanceof ErrorEvent ? event.message : 'WebSocket error';
          Logger.error('WebSocket error', {
            context: 'WebSocketContext',
            data: { error }
          });
          setIsConnecting(false);
        },
        onMessage: (event) => {
          try {
            Logger.debug('Processing raw WebSocket message', {
              context: 'WebSocketContext',
              data: {
                rawData: event.data ? event.data.slice(0, 200) : 'No data',
                isConnected: socketState.connected,
                isReady: socketState.ready,
                userId: user?._id
              }
            });

            // Use pre-parsed data if available
            const data = event.parsedData || JSON.parse(event.data);
            Logger.debug('Processing WebSocket message', {
              context: 'WebSocketContext',
              data: {
                type: data.type,
                hasPayload: !!data.payload,
                isConnected: socketState.connected,
                isReady: socketState.ready,
                userId: user?._id,
                timestamp: new Date().toISOString()
              }
            });

            // Handle the message
            if (data.type === WebSocketMessageType.AUTH_SUCCESS) {
              Logger.info('Received AUTH_SUCCESS, preparing CLIENT_READY', {
                context: 'WebSocketContext',
                data: {
                  userId: user?._id,
                  username: user?.username,
                  isConnected: socketState.connected,
                  timestamp: new Date().toISOString(),
                  payload: data.payload
                }
              });

              // Send CLIENT_READY message with user info
              if (!user?._id || !user?.username) {
                Logger.error('Cannot send CLIENT_READY - missing user info', {
                  context: 'WebSocketContext',
                  data: {
                    hasId: !!user?._id,
                    hasUsername: !!user?.username,
                    isConnected: socketState.connected,
                    isReady: socketState.ready,
                    timestamp: new Date().toISOString()
                  }
                });
                return;
              }

              Logger.debug('Sending CLIENT_READY message', {
                context: 'WebSocketContext',
                data: {
                  userId: user._id,
                  username: user.username,
                  isConnected: socketState.connected,
                  isReady: socketState.ready,
                  timestamp: new Date().toISOString()
                }
              });

              ws.send(WebSocketMessageType.CLIENT_READY, {
                userId: user._id,
                username: user.username
              });
            } else if (data.type === WebSocketMessageType.READY_CONFIRMED) {
              // Let ChatWebSocket handle the ready state
              Logger.info('Client ready confirmed', {
                context: 'WebSocketContext',
                data: {
                  userId: user?._id,
                  timestamp: new Date().toISOString()
                }
              });

              // Only send presence if we haven't already
              if (!socketState.ready) {
                // Send initial presence update
                ws.send(WebSocketMessageType.PRESENCE_CHANGED, {
                  status: 'online'
                });
              }
            } else if (data.type === WebSocketMessageType.INITIAL_PRESENCE) {
              handleInitialPresence(data.payload.users);
            } else if (data.type === WebSocketMessageType.PRESENCE_CHANGED) {
              handleUserPresence(data.payload);
            } else if (data.type === WebSocketMessageType.MESSAGE_RECEIVED) {
              handleMessageReceived(data.payload);
            } else if (data.type === WebSocketMessageType.REACTION_ADDED) {
              handleReaction(data.payload, true);
            } else if (data.type === WebSocketMessageType.REACTION_REMOVED) {
              handleReaction(data.payload, false);
            }
          } catch (error) {
            Logger.error('Failed to process WebSocket message', {
              context: 'WebSocketContext',
              data: {
                error: error instanceof Error ? error.message : String(error),
                rawData: event.data ? event.data.slice(0, 200) : 'No data',
                isConnected: socketState.connected,
                isReady: socketState.ready,
                userId: user?._id
              }
            });
          }
        }
      });

      socketRef.current = ws;
      setSocket(ws);

      // Store cleanup function
      cleanupRef.current = () => {
        if (!mountedRef.current) return;
        Logger.debug('Cleaning up WebSocket connection', {
          context: 'WebSocketContext',
          data: {
            reason: 'unmount_or_config_change',
            readyState: ws.socket?.readyState,
            userId: user?._id,
            timestamp: new Date().toISOString()
          }
        });
        if (ws) {
          ws.close();
          socketRef.current = null;
          setSocket(null);
          setSocketState({
            connected: false,
            ready: false,
            error: null
          });
          setIsConnecting(false);
          setConnectingTimestamp(null);
        }
      };
    };

    // Only initialize if we don't have an active socket
    if (!socketRef.current) {
      initializeSocket();
    }

    // Cleanup function
    return () => {
      if (cleanupRef.current && mountedRef.current) {
        cleanupRef.current();
        setConnectingTimestamp(null);
      }
    };
  }, [isConnecting, config.token, config.userId, user?.username]);

  const sendMessage = (type: WebSocketMessageType, payload: any) => {
    // Allow certain message types before ready state
    const allowedBeforeReady = [
      WebSocketMessageType.AUTH,
      WebSocketMessageType.CLIENT_READY,
      WebSocketMessageType.PRESENCE_CHANGED,
      WebSocketMessageType.TYPING_START,
      WebSocketMessageType.TYPING_STOP,
      WebSocketMessageType.MESSAGE,
      WebSocketMessageType.REACTION_ADDED,
      WebSocketMessageType.REACTION_REMOVED
    ];

    if (!socketState.connected) {
      Logger.warn('Attempted to send message while disconnected', {
        context: 'WebSocketContext',
        data: {
          type,
          hasPayload: !!payload,
          hasSocket: !!socketRef.current,
          socketState,
          userId: user?._id,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (!socketState.ready && !allowedBeforeReady.includes(type)) {
      Logger.warn('Attempted to send message before client was ready', {
        context: 'WebSocketContext',
        data: {
          type,
          hasPayload: !!payload,
          socketState,
          userId: user?._id,
          timestamp: new Date().toISOString(),
          allowedTypes: allowedBeforeReady
        }
      });
      return;
    }

    if (socketRef.current) {
      Logger.debug('Sending message through WebSocket', {
        context: 'WebSocketContext',
        data: {
          type,
          hasPayload: !!payload,
          userId: user?._id,
          socketState,
          timestamp: new Date().toISOString()
        }
      });
      socketRef.current.send(type, payload);
    } else {
      Logger.error('Cannot send message - no socket instance', {
        context: 'WebSocketContext',
        data: {
          type,
          hasPayload: !!payload,
          socketState,
          userId: user?._id,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected: socketState.connected,
        isConnecting,
        lastError: socketState.error,
        sendMessage,
        isReady: socketState.ready,
        socketState
      }}
    >
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
