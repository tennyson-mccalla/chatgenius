import { useChannelStore } from '../channel/store';
import { useMessageStore } from '../message/store';
import { useUnreadStore } from '../unread/store';
import { MessageReceivedPayload, ReactionPayload } from '../../types/websocket.types';
import Logger from '../../utils/logger';

export const handleMessageReceived = (payload: MessageReceivedPayload) => {
  try {
    Logger.debug('Processing received message', {
      context: 'MessageHandlers',
      data: {
        messageId: payload.message._id,
        channelId: payload.channelId,
        senderId: payload.message.sender._id,
        timestamp: new Date().toISOString()
      }
    });

    const messageStore = useMessageStore.getState();
    const channelStore = useChannelStore.getState();
    const unreadStore = useUnreadStore.getState();

    // Add message to store
    messageStore.addMessage(payload.message);

    // Update channel's last message timestamp
    channelStore.updateLastMessage(payload.channelId, new Date(payload.message.createdAt));

    // Increment unread count
    unreadStore.incrementUnread(payload.channelId);

    Logger.debug('Message processing complete', {
      context: 'MessageHandlers',
      data: {
        messageId: payload.message._id,
        channelId: payload.channelId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    Logger.error('Failed to handle received message', {
      context: 'MessageHandlers',
      data: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        rawData: JSON.stringify(payload).slice(0, 200)
      }
    });
  }
};

export const handleReaction = (payload: ReactionPayload, isAdding: boolean) => {
  try {
    Logger.debug('Processing reaction', {
      context: 'MessageHandlers',
      data: {
        messageId: payload.messageId,
        channelId: payload.channelId,
        emoji: payload.emoji,
        userId: payload.userId,
        isAdding,
        timestamp: new Date().toISOString()
      }
    });

    const messageStore = useMessageStore.getState();
    const messages = messageStore.getChannelMessages(payload.channelId);
    const message = messages.find((m) => m._id === payload.messageId);

    if (!message) {
      Logger.warn('Message not found for reaction', {
        context: 'MessageHandlers',
        data: {
          messageId: payload.messageId,
          channelId: payload.channelId,
          availableMessageIds: messages.map(m => m._id)
        }
      });
      return;
    }

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

    Logger.debug('Updating message reactions', {
      context: 'MessageHandlers',
      data: {
        messageId: payload.messageId,
        channelId: payload.channelId,
        reactionCount: updatedReactions.length,
        timestamp: new Date().toISOString()
      }
    });

    messageStore.updateMessageReactions(payload.messageId, payload.channelId, updatedReactions);
  } catch (error) {
    Logger.error('Failed to handle reaction', {
      context: 'MessageHandlers',
      data: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        rawData: JSON.stringify(payload).slice(0, 200)
      }
    });
  }
};
