export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  DND = 'dnd'
}

export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  status?: UserStatus;
  lastSeen?: Date;
}

export interface UserPresence {
  userId: string;
  username: string;
  status: UserStatus;
  lastSeen?: Date;
}
