import { create } from 'zustand';
import { Channel, ChannelState, ChannelStoreState } from '../../types/channel.types';
import { createActions } from './actions';
import api from '../../services/api';

export const useChannelStore = create<ChannelStoreState>((set, get) => ({
  state: ChannelState.UNINITIALIZED,
  channels: [],
  currentChannel: null,
  error: null,
  focusedChannelId: null,

  setFocusedChannel: (channelId: string | null) => {
    console.log('Channel Store: Setting focused channel:', channelId);
    set({ focusedChannelId: channelId });
  },

  getAccessibleChannels: () => {
    const { channels } = get();
    return channels.filter(channel => channel.hasAccess);
  },

  getNonDMChannels: () => {
    const { channels } = get();
    return channels.filter(channel => !channel.isDM && channel.hasAccess);
  },

  getDMChannels: () => {
    const { channels } = get();
    return channels.filter(channel => channel.isDM && channel.hasAccess);
  },

  ...createActions(set, get)
}));

// Debug subscription
useChannelStore.subscribe((state) => {
  console.log('Channel Store Updated:', {
    state: state.state,
    channelCount: state.channels.length,
    accessibleChannels: state.channels.filter(c => c.hasAccess).length,
    currentChannel: state.currentChannel?._id,
    focusedChannel: state.focusedChannelId,
    error: state.error,
    timestamp: new Date().toISOString()
  });
});
