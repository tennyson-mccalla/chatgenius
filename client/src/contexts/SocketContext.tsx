import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { usePresenceStore } from '../store/presenceStore';

export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, isAuthenticated } = useAuthStore();
  const setUserStatus = usePresenceStore((state) => state.setUserStatus);
  const clearPresence = usePresenceStore((state) => state.clearPresence);

  useEffect(() => {
    console.log('Auth state changed', { isAuthenticated, hasToken: !!token });

    // Cleanup function for previous socket
    const cleanup = () => {
      if (socketRef.current) {
        console.log('Cleaning up previous socket connection', {
          id: socketRef.current.id,
          connected: socketRef.current.connected
        });
        socketRef.current.removeAllListeners();
        if (socketRef.current.connected) {
          socketRef.current.disconnect();
        }
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        clearPresence();
      }
    };

    // Clean up previous connection
    cleanup();

    if (isAuthenticated && token) {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const socketUrl = baseUrl.replace(/\/api$/, '');
      console.log('Setting up new socket connection', {
        url: socketUrl,
        hasToken: !!token,
        tokenPrefix: token.substring(0, 20) + '...'
      });

      try {
        // Prevent creating a new socket if one already exists
        if (socketRef.current?.connected) {
          console.log('Socket already exists and is connected');
          return;
        }

        const newSocket = io(socketUrl, {
          auth: { token },
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          withCredentials: true,
          timeout: 60000
        });

        socketRef.current = newSocket;

        // Set up event listeners
        newSocket.on('connect', () => {
          console.log('Socket connected successfully:', {
            id: newSocket.id,
            transport: newSocket.io.engine.transport.name,
            connected: newSocket.connected
          });
          setSocket(newSocket);
          setIsConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', {
            reason,
            wasConnected: newSocket.connected,
            socketId: newSocket.id
          });
          setIsConnected(false);
          // Clear presence state when socket disconnects
          clearPresence();
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', {
            message: error.message,
            type: error.type,
            data: error.data
          });
          setIsConnected(false);
        });

        newSocket.on('presence_update', (data: { userId: string; status: 'online' | 'offline'; user: any }) => {
          console.log('Received presence update:', {
            userId: data.userId,
            status: data.status,
            username: data.user?.username
          });
          setUserStatus(data.userId, data.status, data.user);
        });

        newSocket.on('initial_presence', (presenceList: Array<{ userId: string; status: 'online' | 'offline'; user: any }>) => {
          console.log('Received initial presence:', presenceList);
          clearPresence(); // Clear existing state first
          presenceList.forEach(({ userId, status, user }) => {
            setUserStatus(userId, status, user);
          });
        });

        // Return cleanup function
        return cleanup;
      } catch (error) {
        console.error('Error setting up socket:', error);
        cleanup();
      }
    }

    // Return cleanup function
    return cleanup;
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export { SocketContext };
