import { StoreApi } from 'zustand';
import { TypingState, TypingUser } from './types';

export const createActions = (
  set: StoreApi<TypingState>['setState'],
  get: StoreApi<TypingState>['getState']
) => ({
  addTypingUser: (channelId: string, user: TypingUser) => {
    set((state) => {
      const currentTyping = state.typingUsers[channelId] || [];
      if (currentTyping.some(u => u.userId === user.userId)) {
        return state;
      }
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: [...currentTyping, user]
        }
      };
    });
  },

  removeTypingUser: (channelId: string, userId: string) => {
    set((state) => {
      const currentTyping = state.typingUsers[channelId] || [];
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: currentTyping.filter(u => u.userId !== userId)
        }
      };
    });
  },

  clearTypingUsers: (channelId: string) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [channelId]: []
      }
    }));
  }
});
