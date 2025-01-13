import { create } from 'zustand';
import { channels } from '../services/api';

export interface Channel {
  _id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  isDM: boolean;
  members: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  hasAccess: boolean;
}

interface ChannelState {
  channels: Channel[];
  currentChannel: Channel | null;
  isLoading: boolean;
  error: string | null;
  fetchChannels: () => Promise<void>;
  setCurrentChannel: (channel: Channel) => void;
  getChannelByNameOrId: (nameOrId: string) => Channel | null;
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
      set({ channels: response.data, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching channels:', error);
      set({
        error: error.response?.data?.message || 'Failed to fetch channels',
        isLoading: false
      });
      throw error;
    }
  },

  setCurrentChannel: (channel) => {
    set({ currentChannel: channel });
  },

  getChannelByNameOrId: (nameOrId) => {
    const state = get();
    return state.channels.find(ch => ch._id === nameOrId || ch.name === nameOrId) || null;
  },

  createChannel: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await channels.create(data);
      set(state => ({
        channels: [...state.channels, response.data]
      }));
      return response.data;
    } catch (error: any) {
      console.error('Error creating channel:', error);
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
      return response.data;
    } catch (error: any) {
      console.error('Error updating channel:', error);
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
      return response.data;
    } catch (error: any) {
      console.error('Error adding member:', error);
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
      return response.data;
    } catch (error: any) {
      console.error('Error removing member:', error);
      set({ error: error.response?.data?.message || 'Failed to remove member' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
