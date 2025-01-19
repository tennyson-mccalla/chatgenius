import mongoose from 'mongoose';

interface ChannelMember {
  _id: mongoose.Types.ObjectId;
  username: string;
  avatar?: string;
  status?: string;
}

interface CreateChannelParams {
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: string;
  members: string[];
}

interface Channel {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isPrivate: boolean;
  isDM: boolean;
  members: mongoose.Types.ObjectId[];
  creator?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: Date;
  populate: (field: string, select?: string) => Promise<Channel>;
  save: () => Promise<Channel>;
  toObject: () => any;
}

declare class ChannelService {
  getChannels(userId: string): Promise<any[]>;
  getDMChannels(userId: string): Promise<any[]>;
  createDMChannel(userId1: string, userId2: string): Promise<any>;
  createChannel(params: CreateChannelParams): Promise<any>;
  getChannelById(channelId: string, userId: string): Promise<any>;
  addMemberToChannel(channelId: string, userId: string, addedById: string): Promise<any>;
  removeMemberFromChannel(channelId: string, userId: string, removedById: string): Promise<any>;
  addUserToPublicChannels(userId: string): Promise<Channel[]>;
}

export const channelService: ChannelService;
