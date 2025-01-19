import { ChatWebSocket } from '../../lib/ChatWebSocket';
import {
  WebSocketMessageType,
  MessageReceivedPayload,
  PresencePayload,
  WebSocketMessage,
  ReactionPayload,
  ChannelsLoadedPayload,
  Channel,
  ChannelMember,
  TypingPayload,
  UserStatus
} from '../../types/websocket.types';
import { useChannelStore } from '../channel/store';
import { useMessageStore } from '../message/store';
import { useUnreadStore } from '../unread/store';
import { usePresenceStore } from '../presence/store';
import { useTypingStore } from '../typing/store';
import Logger from '../../utils/logger';

interface InitializeOptions {
  onInitialized?: () => void;
}

export const initializeSocketHandlers = (socket: ChatWebSocket, options?: InitializeOptions) => {
  let isInitialized = false;

  const handleChannelsLoaded = (payload: ChannelsLoadedPayload) => {
    Logger.debug('Received channels', {
      context: 'SocketHandler',
      data: { count: payload.channels.length }
    });
    const channelStore = useChannelStore.getState();
    const channels = payload.channels;

    // Update each channel in the store
    channels.forEach((channel: Channel) => {
      channelStore.addOrUpdateChannel(channel);
    });

    // Set initial channel if none is set
    if (!channelStore.currentChannel && channels.length > 0) {
      channelStore.setCurrentChannel(channels[0]);
    }

    if (!isInitialized) {
      isInitialized = true;
      options?.onInitialized?.();
    }
  };

  const handleChannelJoined = (payload: { channelId: string; userId: string; username: string }) => {
    Logger.debug('Channel joined', {
      context: 'SocketHandler',
      data: payload
    });
    const channelStore = useChannelStore.getState();
    const channel = channelStore.channels.find(ch => ch._id === payload.channelId);
    if (channel) {
      const newMember: ChannelMember = {
        _id: payload.userId,
        username: payload.username
      };
      channelStore.addOrUpdateChannel({
        ...channel,
        members: [...(channel.members || []), newMember]
      });
    }
  };

  const handleMessageReceived = (payload: MessageReceivedPayload) => {
    const messageStore = useMessageStore.getState();
    const channelStore = useChannelStore.getState();
    const unreadStore = useUnreadStore.getState();

    messageStore.addMessage(payload.message);
    channelStore.updateLastMessage(payload.channelId, new Date(payload.message.createdAt));
    unreadStore.incrementUnread(payload.channelId);
  };

  const handleTyping = (payload: TypingPayload, isStarting: boolean) => {
    const typingStore = useTypingStore.getState();
    if (isStarting) {
      typingStore.addTypingUser(payload.channelId, {
        userId: payload.userId,
        username: payload.username
      });
    } else {
      typingStore.removeTypingUser(payload.channelId, payload.userId);
    }
  };

  const handlePresenceChanged = (payload: PresencePayload) => {
    const presenceStore = usePresenceStore.getState();
    presenceStore.setUserStatus(
      payload.userId,
      payload.status as UserStatus,
      {
        _id: payload.userId,
        username: payload.username
      }
    );
  };

  const handleReaction = (payload: ReactionPayload, isAdding: boolean) => {
    const messageStore = useMessageStore.getState();
    const messages = messageStore.getChannelMessages(payload.channelId);
    const message = messages.find((m) => m._id === payload.messageId);

    if (message) {
      const currentReactions = message.reactions || [];
      let updatedReactions = [...currentReactions];

      if (isAdding) {
        const existingReaction = currentReactions.find((r) => r.emoji === payload.emoji);
        if (existingReaction) {
          if (!existingReaction.users.includes(payload.userId)) {
            updatedReactions = currentReactions.map(
              (r) => r.emoji === payload.emoji ? { ...r, users: [...r.users, payload.userId] } : r
            );
          }
        } else {
          updatedReactions = [...currentReactions, { emoji: payload.emoji, users: [payload.userId] }];
        }
      } else {
        updatedReactions = currentReactions
          .map((r) => r.emoji === payload.emoji
            ? { ...r, users: r.users.filter((id) => id !== payload.userId) }
            : r
          )
          .filter((r) => r.users.length > 0);
      }

      messageStore.updateMessageReactions(payload.messageId, payload.channelId, updatedReactions);
    }
  };

  const messageHandler = (data: any) => {
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : data;
      const { type, payload } = message;

      switch (type) {
        case WebSocketMessageType.CHANNELS_LOADED:
          handleChannelsLoaded(payload as ChannelsLoadedPayload);
          break;

        case WebSocketMessageType.CHANNEL_JOINED:
          handleChannelJoined(payload as { channelId: string; userId: string; username: string });
          break;

        case WebSocketMessageType.MESSAGE_RECEIVED:
          handleMessageReceived(payload as MessageReceivedPayload);
          break;

        case WebSocketMessageType.TYPING_START:
          handleTyping(payload as TypingPayload, true);
          break;

        case WebSocketMessageType.TYPING_STOP:
          handleTyping(payload as TypingPayload, false);
          break;

        case WebSocketMessageType.PRESENCE_CHANGED:
          handlePresenceChanged(payload as PresencePayload);
          break;

        case WebSocketMessageType.REACTION_ADD:
        case WebSocketMessageType.REACTION_ADDED:
          handleReaction(payload as ReactionPayload, true);
          break;

        case WebSocketMessageType.REACTION_REMOVE:
        case WebSocketMessageType.REACTION_REMOVED:
          handleReaction(payload as ReactionPayload, false);
          break;
      }
    } catch (error) {
      Logger.error('Error handling WebSocket message', {
        context: 'SocketHandler',
        data: { error }
      });
    }
  };

  // Update the message handler in the ChatWebSocket instance
  socket.updateMessageHandler(messageHandler);

  return {
    cleanup: () => {
      socket.updateMessageHandler(undefined);
    },
    isInitialized: () => isInitialized
  };
};
