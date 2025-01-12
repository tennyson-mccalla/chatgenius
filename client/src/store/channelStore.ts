import { create } from 'zustand';
import { channels } from '../services/api';

interface Channel {
  _id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  isDM: boolean;
  members: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

interface ChannelState {
  channels: Channel[];
  currentChannel: Channel | null;
  isLoading: boolean;
  error: string | null;
  fetchChannels: () => Promise<void>;
  setCurrentChannel: (channel: Channel) => void;
  createChannel: (data: { name: string; description?: string; isPrivate: boolean; members?: string[] }) => Promise<void>;
  updateChannel: (channelId: string, data: { name?: string; description?: string; isPrivate?: boolean }) => Promise<void>;
  addMember: (channelId: string, userId: string) => Promise<void>;
  removeMember: (channelId: string, userId: string) => Promise<void>;
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  currentChannel: null,
  isLoading: false,
  error: null,

  fetchChannels: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await channels.getAll();
      set({ channels: response.data });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch channels' });
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentChannel: (channel) => {
    set({ currentChannel: channel });
  },

  createChannel: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await channels.create(data);
      set(state => ({
        channels: [...state.channels, response.data]
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create channel' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateChannel: async (channelId, data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await channels.update(channelId, data);
      set(state => ({
        channels: state.channels.map(ch =>
          ch._id === channelId ? response.data : ch
        ),
        currentChannel: state.currentChannel?._id === channelId ? response.data : state.currentChannel
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update channel' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  addMember: async (channelId, userId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await channels.addMember(channelId, userId);
      set(state => ({
        channels: state.channels.map(ch =>
          ch._id === channelId ? response.data : ch
        ),
        currentChannel: state.currentChannel?._id === channelId ? response.data : state.currentChannel
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to add member' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  removeMember: async (channelId, userId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await channels.removeMember(channelId, userId);
      set(state => ({
        channels: state.channels.map(ch =>
          ch._id === channelId ? response.data : ch
        ),
        currentChannel: state.currentChannel?._id === channelId ? response.data : state.currentChannel
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to remove member' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
