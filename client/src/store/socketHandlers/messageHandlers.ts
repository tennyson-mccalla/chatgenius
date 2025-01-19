import { Socket } from 'socket.io-client';
import { useChannelStore } from '../channel/store';
import { useAuth } from '../authStore';
import { useUnreadStore } from '../unread/store';
import { useMessageStore } from '../message/store';

export const handleMessageReceived = (data: any) => {
  try {
    const message = data.message;
    if (!message) {
      throw new Error('No message data found');
    }

    console.log('[SocketHandler] Received message:', {
      messageId: message._id,
      channelId: message.channelId || message.channel?._id,
      senderId: message.sender._id
    });

    const channelStore = useChannelStore.getState();
    const authStore = useAuth.getState();
    const messageStore = useMessageStore.getState();
    const unreadStore = useUnreadStore.getState();

    // Handle both message formats
    const channelId = message.channelId || message.channel?._id;
    if (!channelId) {
      throw new Error('No channel ID found in message');
    }

    // Always add message to store to maintain message history
    messageStore.addMessage(message);

    // Update channel's last message timestamp
    if (channelStore.updateLastMessage) {
      channelStore.updateLastMessage(channelId, new Date(message.createdAt));
    }

    // Handle unread counts
    const isInDifferentChannel = channelStore.currentChannel?._id !== channelId;
    const isFromOtherUser = message.sender._id !== authStore.user?._id;

    console.log('[SocketHandler] Message state:', {
      channelId,
      currentChannel: channelStore.currentChannel?._id,
      isInDifferentChannel,
      isFromOtherUser,
      willIncrementUnread: isInDifferentChannel && isFromOtherUser
    });

    if (isInDifferentChannel && isFromOtherUser) {
      // Only increment unread if message is from another user and we're in a different channel
      unreadStore.incrementUnread(channelId);
    }
  } catch (error) {
    console.error('Error handling message_received:', error);
  }
};
