/**
 * Represents the possible states of a channel.
 * Used to track the lifecycle of channel operations.
 */
export enum ChannelState {
  UNINITIALIZED = 'UNINITIALIZED',
  LOADING = 'LOADING',
  READY = 'READY',
  ERROR = 'ERROR'
}

/**
 * Interface for a channel member.
 */
export interface ChannelMember {
  _id: string;
  username: string;
  avatar?: string;
  status?: string;
}

/**
 * Interface for a channel.
 */
export interface Channel {
  _id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  isDM: boolean;
  hasAccess: boolean;
  members: ChannelMember[];
  lastMessage?: Date;
  lastMessageAt?: Date;
}

/**
 * Interface for channel creation data.
 */
export interface CreateChannelData {
  name: string;
  description?: string;
  isPrivate?: boolean;
  members?: string[];
}

/**
 * Interface for channel store actions.
 */
export interface ChannelActions {
  fetchChannels: () => Promise<void>;
  fetchDMChannels: () => Promise<void>;
  setCurrentChannel: (channel: Channel | null) => void;
  addOrUpdateChannel: (channel: Channel) => void;
  createChannel: (data: CreateChannelData) => Promise<void>;
  updateLastMessage: (channelId: string, timestamp: Date) => void;
  setFocusedChannel: (channelId: string | null) => void;
}

/**
 * Interface for the channel store state.
 */
export interface ChannelStoreState {
  state: ChannelState;
  channels: Channel[];
  currentChannel: Channel | null;
  error: string | null;
  focusedChannelId: string | null;

  // Channel filtering methods
  getAccessibleChannels: () => Channel[];
  getNonDMChannels: () => Channel[];
  getDMChannels: () => Channel[];

  // Channel actions
  setFocusedChannel: (channelId: string | null) => void;
  fetchChannels: () => Promise<void>;
  fetchDMChannels: () => Promise<void>;
  setCurrentChannel: (channel: Channel | null) => void;
  addOrUpdateChannel: (channel: Channel) => void;
  createChannel: (data: CreateChannelData) => Promise<void>;
  updateLastMessage: (channelId: string, lastMessageAt: Date) => void;
}
