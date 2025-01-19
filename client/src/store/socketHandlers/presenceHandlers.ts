import { usePresenceStore } from '../presence/store';
import { UserStatus } from '../presence/types';

interface PresenceData {
  userId: string;
  username: string;
  status: UserStatus;
  user?: {
    _id: string;
    username: string;
  };
}

export const handleUserPresence = (data: PresenceData) => {
  console.log('Received presence update:', {
    userId: data.userId,
    status: data.status,
    username: data.username || data.user?.username,
    timestamp: new Date().toISOString()
  });

  const presenceStore = usePresenceStore.getState();
  presenceStore.setUserStatus(data.userId, data.status, {
    _id: data.userId,
    username: data.username || data.user?.username || ''
  });

  if (data.status === 'offline') {
    presenceStore.updateLastSeen(data.userId, new Date());
  }
};

export const handleInitialPresence = (presenceList: PresenceData[]) => {
  console.log('Received initial presence:', {
    userCount: presenceList.length,
    users: presenceList.map(p => ({
      userId: p.userId,
      status: p.status,
      username: p.username || p.user?.username
    })),
    timestamp: new Date().toISOString()
  });

  const presenceStore = usePresenceStore.getState();

  // Clear existing presence data first
  presenceStore.clearPresence();

  // Set presence for each user
  presenceList.forEach(data => {
    if (data.userId) {
      presenceStore.setUserStatus(data.userId, data.status, {
        _id: data.userId,
        username: data.username || data.user?.username || ''
      });
      if (data.status === 'offline') {
        presenceStore.updateLastSeen(data.userId, new Date());
      }
    } else {
      console.warn('Invalid presence data:', data);
    }
  });
};
