import { StoreApi } from 'zustand';
import { UnreadState, UnreadActions } from './types';
import api from '../../services/api';
import { ChatWebSocket } from '../../lib/ChatWebSocket';
import { WebSocketMessageType, WebSocketMessage, MessageReadPayload, UnreadUpdatePayload } from '../../types/websocket.types';

export const createActions = (
  set: StoreApi<UnreadState & UnreadActions>['setState'],
  get: StoreApi<UnreadState & UnreadActions>['getState']
) => ({
  setUnreadCount: (channelId: string, count: number) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [channelId]: count,
      },
    }));
  },

  incrementUnread: (channelId: string) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [channelId]: (state.unreadCounts[channelId] || 0) + 1,
      },
    }));
  },

  markChannelAsRead: async (channelId: string) => {
    try {
      // Optimistically update the UI
      set((state) => ({
        unreadCounts: {
          ...state.unreadCounts,
          [channelId]: 0,
        },
      }));

      // Send the update to the server
      await api.post(`/api/messages/channel/${channelId}/read`);
    } catch (error) {
      console.error('Error marking channel as read:', error);
    }
  },

  fetchUnreadCounts: async () => {
    try {
      const response = await api.get('/api/messages/unread');
      set({ unreadCounts: response.data });
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  },

  initializeUnreadSocket: (socket: ChatWebSocket) => {
    if (!socket) return;

    console.log('[UnreadStore] Initializing unread socket handlers');

    const cleanup = socket.onMessage((message: WebSocketMessage) => {
      try {
        if (message.type === WebSocketMessageType.MESSAGE_READ) {
          const payload = message.payload as MessageReadPayload;
          get().setUnreadCount(payload.channelId, 0);
        } else if (message.type === WebSocketMessageType.UNREAD_UPDATED) {
          const payload = message.payload as UnreadUpdatePayload;
          get().setUnreadCount(payload.channelId, payload.count);
        }
      } catch (error) {
        console.error('Error handling unread message:', error);
      }
    });

    set({ initialized: true });
    return cleanup;
  },

  cleanup: () => {
    set({ unreadCounts: {}, initialized: false });
  }
});
