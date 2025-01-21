import { useChannelStore } from '../channel/store';
import { Channel, ChannelMember, ChannelsLoadedPayload } from '../../types/websocket.types';
import Logger from '../../utils/logger';

export const handleChannelsLoaded = (payload: ChannelsLoadedPayload, onInitialized?: () => void) => {
  try {
    Logger.debug('Processing channels loaded event', {
      context: 'ChannelHandlers',
      data: {
        channelCount: payload.channels.length,
        channelIds: payload.channels.map(ch => ch._id),
        timestamp: new Date().toISOString()
      }
    });

    const channelStore = useChannelStore.getState();
    const channels = payload.channels;

    // Update each channel in the store
    channels.forEach((channel: Channel) => {
      Logger.debug('Adding/updating channel', {
        context: 'ChannelHandlers',
        data: {
          channelId: channel._id,
          name: channel.name,
          memberCount: channel.members?.length || 0,
          timestamp: new Date().toISOString()
        }
      });
      channelStore.addOrUpdateChannel(channel);
    });

    // Set initial channel if none is set
    if (!channelStore.currentChannel && channels.length > 0) {
      Logger.debug('Setting initial channel', {
        context: 'ChannelHandlers',
        data: {
          channelId: channels[0]._id,
          name: channels[0].name,
          timestamp: new Date().toISOString()
        }
      });
      channelStore.setCurrentChannel(channels[0]);
    }

    onInitialized?.();
  } catch (error) {
    Logger.error('Failed to handle channels loaded', {
      context: 'ChannelHandlers',
      data: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        rawData: JSON.stringify(payload).slice(0, 200)
      }
    });
  }
};

export const handleChannelJoined = (payload: { channelId: string; userId: string; username: string }) => {
  try {
    Logger.debug('Processing channel joined event', {
      context: 'ChannelHandlers',
      data: {
        channelId: payload.channelId,
        userId: payload.userId,
        username: payload.username,
        timestamp: new Date().toISOString()
      }
    });

    const channelStore = useChannelStore.getState();
    const channel = channelStore.channels.find(ch => ch._id === payload.channelId);

    if (!channel) {
      Logger.warn('Channel not found for join event', {
        context: 'ChannelHandlers',
        data: {
          channelId: payload.channelId,
          availableChannels: channelStore.channels.map(ch => ch._id)
        }
      });
      return;
    }

    const newMember: ChannelMember = {
      _id: payload.userId,
      username: payload.username
    };

    Logger.debug('Adding member to channel', {
      context: 'ChannelHandlers',
      data: {
        channelId: channel._id,
        channelName: channel.name,
        newMemberId: newMember._id,
        newMemberUsername: newMember.username,
        currentMemberCount: channel.members?.length || 0,
        timestamp: new Date().toISOString()
      }
    });

    channelStore.addOrUpdateChannel({
      ...channel,
      members: [...(channel.members || []), newMember]
    });
  } catch (error) {
    Logger.error('Failed to handle channel joined', {
      context: 'ChannelHandlers',
      data: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        rawData: JSON.stringify(payload).slice(0, 200)
      }
    });
  }
};
