import { UserStatus } from '../../../../server/src/models/types';

export interface PresenceUser {
  _id: string;
  username: string;
  status: UserStatus;
  lastSeen?: Date;
}

export interface PresenceState {
  userStatuses: { [userId: string]: PresenceUser };
}

export interface PresenceActions {
  setUserStatus: (userId: string, status: UserStatus, user: { _id: string; username: string }) => void;
  clearPresence: () => void;
  updateLastSeen: (userId: string, lastSeen: Date) => void;
}
