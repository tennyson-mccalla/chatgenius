import { StoreApi } from 'zustand';
import { PresenceState, PresenceUser } from './types';
import { UserStatus } from '../../types/user.types';
import Logger from '../../utils/logger';

export const createActions = (
  set: StoreApi<PresenceState>['setState'],
  get: StoreApi<PresenceState>['getState']
) => ({
  setUserStatus: (userId: string, status: UserStatus, user: { _id: string; username: string }) => {
    Logger.debug('Setting user status', {
      context: 'PresenceStore',
      data: {
        userId,
        username: user.username,
        status,
        timestamp: new Date().toISOString()
      }
    });

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
  },

  setInitialPresence: (users: Array<{ userId: string; username: string; status: UserStatus; lastSeen?: Date }>) => {
    Logger.debug('Setting initial presence', {
      context: 'PresenceStore',
      data: {
        userCount: users.length,
        users: users.map(u => ({ id: u.userId, username: u.username, status: u.status }))
      }
    });

    const userStatuses = users.reduce<Record<string, PresenceUser>>((acc, user) => {
      acc[user.userId] = {
        _id: user.userId,
        username: user.username,
        status: user.status,
        lastSeen: user.lastSeen
      };
      return acc;
    }, {});

    set({ userStatuses });
  },

  clearPresence: () => {
    Logger.debug('Clearing presence data', {
      context: 'PresenceStore'
    });
    set({ userStatuses: {} });
  },

  updateLastSeen: (userId: string, lastSeen: Date) => {
    set((state) => {
      const user = state.userStatuses[userId];
      if (!user) {
        Logger.warn('Attempted to update lastSeen for non-existent user', {
          context: 'PresenceStore',
          data: { userId }
        });
        return state;
      }

      Logger.debug('Updating last seen', {
        context: 'PresenceStore',
        data: {
          userId,
          username: user.username,
          lastSeen: lastSeen.toISOString()
        }
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
  }
});
