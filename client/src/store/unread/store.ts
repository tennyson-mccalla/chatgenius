import { create } from 'zustand';
import { createActions } from './actions';
import { UnreadState, UnreadActions } from './types';

const initialState: UnreadState = {
  unreadCounts: {},
  initialized: false,
};

export const useUnreadStore = create<UnreadState & UnreadActions>((set, get) => ({
  ...initialState,
  ...createActions(set, get),
}));

// Export the store's actions directly for use in components
export const {
  setUnreadCount,
  incrementUnread,
  markChannelAsRead,
  fetchUnreadCounts,
  initializeUnreadSocket,
  cleanup,
} = useUnreadStore.getState();
