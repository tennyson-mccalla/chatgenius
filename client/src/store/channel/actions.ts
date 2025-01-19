import api from '../../services/api';
import { Channel, ChannelState, ChannelStoreState, CreateChannelData } from '../../types/channel.types';
import { StoreApi } from 'zustand';

export const createActions = (
  set: StoreApi<ChannelStoreState>['setState'],
  get: StoreApi<ChannelStoreState>['getState']
) => ({
  fetchChannels: async () => {
    const state = get();
    // Skip if already loading
    if (state.state === ChannelState.LOADING) {
      console.log('[ChannelStore] Skip fetch - already loading');
      return;
    }

    try {
      console.log('[ChannelStore] Starting channel fetch');
      set({ state: ChannelState.LOADING, error: null });

      // Fetch both regular and DM channels in parallel
      const [regularResponse, dmResponse] = await Promise.all([
        api.get('/api/channels'),
        api.get('/api/channels/dm')
      ]);

      const regularChannels = regularResponse.data;
      const dmChannels = dmResponse.data;

      console.log('[ChannelStore] Channels fetched:', {
        regularCount: regularChannels.length,
        dmCount: dmChannels.length,
        total: regularChannels.length + dmChannels.length
      });

      // Merge channels and preserve populated members
      const existingChannels = get().channels;
      const mergedChannels = [...regularChannels, ...dmChannels].map(channel => {
        const existingChannel = existingChannels.find((ch: Channel) => ch._id === channel._id);
        if (existingChannel?.members?.some((m: any) => typeof m === 'object')) {
          return {
            ...channel,
            members: existingChannel.members
          };
        }
        return channel;
      });

      set({
        channels: mergedChannels,
        state: ChannelState.READY
      });

      // Set initial channel if needed
      const updatedState = get();
      if (!updatedState.currentChannel && mergedChannels.length > 0) {
        const firstRegularChannel = mergedChannels.find((ch: Channel) => !ch.isDM);
        if (firstRegularChannel) {
          console.log('[ChannelStore] Setting initial channel:', firstRegularChannel._id);
          get().setCurrentChannel(firstRegularChannel);
        }
      }
    } catch (error: any) {
      console.error('[ChannelStore] Error fetching channels:', error);
      set({
        error: error.response?.data?.message || 'Failed to fetch channels',
        state: ChannelState.ERROR
      });
    }
  },

  setCurrentChannel: (channel: Channel | null) => {
    if (channel) {
      console.log('Channel Store: Setting current channel:', {
        id: channel._id,
        isDM: channel.isDM,
        memberCount: channel.members?.length,
        memberTypes: channel.members?.map((m: any) => typeof m),
        hasPopulatedMembers: channel.members?.some((m: any) => typeof m === 'object')
      });
    }
    set({ currentChannel: channel });
  },

  addOrUpdateChannel: (channel: Channel) => {
    set(state => {
      const existingIndex = state.channels.findIndex((ch: Channel) => ch._id === channel._id);
      const existingHasPopulatedMembers = existingIndex >= 0 &&
        state.channels[existingIndex].members?.some((m: any) => typeof m === 'object');
      const newHasPopulatedMembers = channel.members?.some((m: any) => typeof m === 'object');

      console.log('Channel Store: Adding/Updating channel:', {
        channelId: channel._id,
        action: existingIndex >= 0 ? 'update' : 'add',
        existingHasPopulatedMembers,
        newHasPopulatedMembers,
        willPreserveExisting: existingHasPopulatedMembers && !newHasPopulatedMembers
      });

      if (existingIndex >= 0) {
        if (existingHasPopulatedMembers && !newHasPopulatedMembers) {
          const updatedChannel = {
            ...channel,
            members: state.channels[existingIndex].members
          };
          const newChannels = [...state.channels];
          newChannels[existingIndex] = updatedChannel;
          return { channels: newChannels };
        }
        const newChannels = [...state.channels];
        newChannels[existingIndex] = channel;
        return { channels: newChannels };
      }
      return { channels: [...state.channels, channel] };
    });
  },

  createChannel: async (data: CreateChannelData) => {
    try {
      set({ state: ChannelState.LOADING, error: null });
      const response = await api.post('/api/channels', data);
      const newChannel = response.data;
      get().addOrUpdateChannel(newChannel);
      set({ state: ChannelState.READY });
    } catch (error: any) {
      console.error('Error creating channel:', error);
      set({
        error: error.response?.data?.message || 'Failed to create channel',
        state: ChannelState.ERROR
      });
      throw error;
    }
  },

  updateLastMessage: (channelId: string, timestamp: Date) => {
    set((state) => {
      const channels = state.channels.map((ch: Channel) => {
        if (ch._id === channelId) {
          return {
            ...ch,
            lastMessageAt: timestamp
          };
        }
        return ch;
      });

      // Only update currentChannel if it's the same channel
      const currentChannel = state.currentChannel?._id === channelId
        ? { ...state.currentChannel, lastMessageAt: timestamp }
        : state.currentChannel;

      return {
        ...state,
        channels,
        currentChannel
      };
    });
  }
});
