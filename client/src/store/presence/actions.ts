import { StoreApi } from 'zustand';
import { PresenceState } from './types';
import { UserStatus } from '../../../../server/src/models/types';
import api from '../../services/api';

export const createActions = (
  set: StoreApi<PresenceState>['setState'],
  get: StoreApi<PresenceState>['getState']
) => ({
  setUserStatus: async (userId: string, status: UserStatus, user: { _id: string; username: string }) => {
    console.log('Setting user status:', {
      userId,
      username: user.username,
      status,
      timestamp: new Date().toISOString()
    });

    // Update local state
    set((state) => ({
      userStatuses: {
        ...state.userStatuses,
        [userId]: {
          _id: user._id,
          username: user.username,
          status,
          lastSeen: status === UserStatus.OFFLINE ? new Date() : undefined
        }
      }
    }));

    // If it's the current user, update the server
    const currentUser = get().userStatuses[userId];
    if (currentUser && status !== currentUser.status) {
      try {
        await api.post('/api/users/status', { status });
      } catch (error) {
        console.error('Failed to update server status:', error);
      }
    }
  },

  clearPresence: () => {
    console.log('Clearing presence data');
    set({ userStatuses: {} });
  },

  updateLastSeen: async (userId: string, lastSeen: Date) => {
    set((state) => {
      const user = state.userStatuses[userId];
      if (!user) {
        console.warn('Attempted to update lastSeen for non-existent user:', userId);
        return state;
      }

      console.log('Updating last seen:', {
        userId,
        username: user.username,
        lastSeen: lastSeen.toISOString()
      });

      return {
        userStatuses: {
          ...state.userStatuses,
          [userId]: {
            ...user,
            lastSeen,
            status: UserStatus.OFFLINE
          }
        }
      };
    });

    // Update server if it's the current user
    try {
      await api.post('/api/users/last-seen', { lastSeen });
    } catch (error) {
      console.error('Failed to update server last seen:', error);
    }
  }
});
