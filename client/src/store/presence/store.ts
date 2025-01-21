import { create } from 'zustand';
import { PresenceState, PresenceActions } from './types';
import { createActions } from './actions';
import Logger from '../../utils/logger';

const initialState: PresenceState = {
  userStatuses: {}
};

export const usePresenceStore = create<PresenceState & PresenceActions>((set, get) => ({
  ...initialState,
  ...createActions(set, get)
}));

// Add debug subscription
usePresenceStore.subscribe((state) => {
  Logger.debug('Presence store updated', {
    context: 'PresenceStore',
    data: {
      userCount: Object.keys(state.userStatuses).length,
      users: Object.entries(state.userStatuses).map(([id, user]) => ({
        id,
        username: user.username,
        status: user.status,
        lastSeen: user.lastSeen?.toISOString()
      })),
      timestamp: new Date().toISOString()
    }
  });
});
