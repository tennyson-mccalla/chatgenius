import { usePresenceStore } from '../presence/store';
import { UserStatus } from '../../types/user.types';
import { PresencePayload } from '../../types/websocket.types';
import Logger from '../../utils/logger';

export const handleUserPresence = (payload: PresencePayload) => {
  try {
    Logger.debug('Processing presence update', {
      context: 'PresenceHandlers',
      data: {
        userId: payload.userId,
        username: payload.username,
        status: payload.status,
        timestamp: new Date().toISOString()
      }
    });

    const presenceStore = usePresenceStore.getState();
    presenceStore.setUserStatus(
      payload.userId,
      payload.status as UserStatus,
      {
        _id: payload.userId,
        username: payload.username
      }
    );

    if (payload.status === UserStatus.OFFLINE && payload.lastSeen) {
      presenceStore.updateLastSeen(payload.userId, new Date(payload.lastSeen));
    }

    Logger.debug('Presence update complete', {
      context: 'PresenceHandlers',
      data: {
        userId: payload.userId,
        username: payload.username,
        status: payload.status,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    Logger.error('Failed to handle presence update', {
      context: 'PresenceHandlers',
      data: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        rawData: JSON.stringify(payload).slice(0, 200)
      }
    });
  }
};

export const handleInitialPresence = (presenceList: PresencePayload[]) => {
  try {
    Logger.debug('Processing initial presence', {
      context: 'PresenceHandlers',
      data: {
        userCount: presenceList.length,
        users: presenceList.map(p => ({
          id: p.userId,
          username: p.username,
          status: p.status
        })),
        timestamp: new Date().toISOString()
      }
    });

    const presenceStore = usePresenceStore.getState();

    // Clear existing presence data first
    presenceStore.clearPresence();

    // Set presence for each user
    presenceList.forEach(data => {
      if (data.userId) {
        presenceStore.setUserStatus(data.userId, data.status as UserStatus, {
          _id: data.userId,
          username: data.username
        });
        if (data.status === UserStatus.OFFLINE && data.lastSeen) {
          presenceStore.updateLastSeen(data.userId, new Date(data.lastSeen));
        }
      } else {
        Logger.warn('Invalid presence data:', {
          context: 'PresenceHandlers',
          data
        });
      }
    });

    Logger.debug('Initial presence processing complete', {
      context: 'PresenceHandlers',
      data: {
        processedUserCount: presenceList.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    Logger.error('Failed to handle initial presence', {
      context: 'PresenceHandlers',
      data: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        rawData: JSON.stringify(presenceList).slice(0, 200)
      }
    });
  }
};
