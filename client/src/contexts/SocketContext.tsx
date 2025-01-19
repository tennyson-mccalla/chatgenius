import React, { createContext, useContext } from 'react';
import { useAuth } from '../store/authStore';
import { WebSocketMessageType } from '../types/websocket.types';

interface SocketContextType {
  isConnected: boolean;
  sendMessage: (type: WebSocketMessageType, payload: any) => void;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  sendMessage: () => {}
});

export function useSocket() {
  return useContext(SocketContext);
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isConnected, sendMessage } = useAuth();

  return (
    <SocketContext.Provider value={{ isConnected, sendMessage }}>
      {children}
    </SocketContext.Provider>
  );
};
