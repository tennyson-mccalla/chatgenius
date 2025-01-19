import mongoose, { Document } from 'mongoose';

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away'
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  status: UserStatus;
  isGuest?: boolean;
  lastSeen?: Date;
  avatar?: string;
  email: string;
  password: string;
}

export interface IChannel extends Document {
  name: string;
  description?: string;
  isPrivate: boolean;
  isDM: boolean;
  members: mongoose.Types.ObjectId[];  // Unpopulated
  createdBy: mongoose.Types.ObjectId;  // Unpopulated
  hasAccess?: boolean;
  messages?: mongoose.Types.ObjectId[];
}

export interface IMessage extends Document {
  content: string;
  channelId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  readBy: mongoose.Types.ObjectId[];
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUnreadMessage extends Document {
  channelId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  count: number;
  lastMessageAt?: Date;
}

export interface IPasswordReset extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
}

// Interface for populated channel
export interface IPopulatedChannel extends Omit<IChannel, 'members' | 'createdBy'> {
  members: IUser[];
  createdBy: IUser;
}
