import { useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import type { SocketContextType } from '../contexts/SocketContext';

export const useSocket = (): SocketContextType => useContext(SocketContext);
