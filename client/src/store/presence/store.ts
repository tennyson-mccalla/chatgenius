import { create } from 'zustand';
import { PresenceState } from './types';
import { createActions } from './actions';

export const usePresenceStore = create<PresenceState & ReturnType<typeof createActions>>((set, get) => ({
  userStatuses: {},
  ...createActions(set, get)
}));

// Debug subscription (after store creation)
usePresenceStore.subscribe((state) => {
  console.log('Presence store updated:', {
    userCount: Object.keys(state.userStatuses).length,
    users: Object.entries(state.userStatuses).map(([id, user]) => ({
      id,
      username: user.username,
      status: user.status,
      lastSeen: user.lastSeen
    })),
    timestamp: new Date().toISOString()
  });
});
