import { create } from 'zustand';

type UserStatus = 'online' | 'offline';

interface UserInfo {
  _id: string;
  username: string;
  avatar?: string;
}

interface PresenceInfo {
  status: UserStatus;
  user: UserInfo;
}

interface UserPresence {
  [userId: string]: PresenceInfo;
}

interface PresenceState {
  userPresence: UserPresence;
  setUserStatus: (userId: string, status: UserStatus, user: UserInfo) => void;
  clearPresence: () => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  userPresence: {},

  setUserStatus: (userId, status, user) => {
    console.log('Setting user status:', { userId, status, username: user?.username });
    set((state) => ({
      userPresence: {
        ...state.userPresence,
        [userId]: { status, user },
      },
    }));
  },

  clearPresence: () => {
    console.log('Clearing presence state');
    set({ userPresence: {} });
  },
}));
