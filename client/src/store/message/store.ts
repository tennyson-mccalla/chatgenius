import { create } from 'zustand';
import api from '../../services/api';
import { SUPPORTED_REACTIONS } from '../../features/reactions';

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  channel?: {
    _id: string;
  };
  channelId?: string;
  createdAt: string;
  reactions?: Array<{
    emoji: string;
    users: string[];
  }>;
}

interface MessageState {
  messagesByChannel: Record<string, Message[]>;
  isLoading: boolean;
  error: string | null;
  currentChannelId: string | null;
  fetchingChannelId: string | null; // Track which channel is being fetched
}

interface MessageStore extends MessageState {
  fetchMessages: (channelId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  getChannelMessages: (channelId: string) => Message[];
  clearChannelMessages: (channelId: string) => void;
  setCurrentChannelId: (channelId: string | null) => void;
  updateMessageReactions: (messageId: string, channelId: string, reactions: Message['reactions']) => void;
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  messagesByChannel: {},
  isLoading: false,
  error: null,
  currentChannelId: null,
  fetchingChannelId: null,

  setCurrentChannelId: (channelId: string | null) => {
    const currentState = get();
    if (channelId !== currentState.currentChannelId) {
      console.log('Message Store: Setting current channel:', channelId);
      set({
        currentChannelId: channelId,
        isLoading: false,
        error: null,
        fetchingChannelId: null
      });
    }
  },

  fetchMessages: async (channelId: string) => {
    const state = get();
    // Only prevent duplicate fetches for the same channel
    if (state.fetchingChannelId === channelId) {
      console.log('Message Store: Already fetching messages for channel:', channelId);
      return;
    }

    // If we already have messages for this channel, use them
    if (state.messagesByChannel[channelId]?.length > 0) {
      console.log('Message Store: Using cached messages for channel:', channelId);
      return;
    }

    console.log('Message Store: Fetching messages for channel:', channelId);
    try {
      set({ fetchingChannelId: channelId, isLoading: true, error: null });
      const response = await api.get(`/api/messages/channel/${channelId}`);

      set(state => ({
        messagesByChannel: {
          ...state.messagesByChannel,
          [channelId]: response.data
        },
        isLoading: false,
        error: null,
        fetchingChannelId: null
      }));
      console.log('Message Store: Fetched messages for channel:', channelId);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      set({
        error: error.response?.data?.message || 'Failed to fetch messages',
        isLoading: false,
        fetchingChannelId: null
      });
    }
  },

  addMessage: (message: Message) => {
    // Handle both message formats for channel ID
    const channelId = message.channel?._id || message.channelId;
    if (!channelId) {
      console.warn('Message has no channel ID:', message);
      return;
    }

    const state = get();
    const channelMessages = state.messagesByChannel[channelId] || [];

    // Check if message already exists
    if (channelMessages.some(m => m._id === message._id)) {
      console.log('[MessageStore] Skipping duplicate message:', { messageId: message._id, channelId });
      return;
    }

    console.log('[MessageStore] Adding message:', {
      channelId,
      messageId: message._id,
      currentChannelId: state.currentChannelId,
      existingMessages: channelMessages.length,
      reactions: message.reactions,
      messagesByChannel: Object.keys(state.messagesByChannel).map(id => ({
        channelId: id,
        count: state.messagesByChannel[id]?.length
      }))
    });

    // Ensure reactions array exists
    const messageWithReactions = {
      ...message,
      reactions: message.reactions || []
    };

    // Sort messages by createdAt
    const newMessages = [...channelMessages, messageWithReactions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Preserve messages for other channels
    set({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: newMessages
      }
    });

    console.log('[MessageStore] Updated messages:', {
      channelId,
      newCount: newMessages.length,
      allChannels: Object.keys(state.messagesByChannel).length
    });
  },

  getChannelMessages: (channelId: string) => {
    return get().messagesByChannel[channelId] || [];
  },

  clearChannelMessages: (channelId: string) => {
    set((state) => {
      const { [channelId]: _, ...rest } = state.messagesByChannel;
      return {
        messagesByChannel: rest
      };
    });
  },

  updateMessageReactions: (messageId: string, channelId: string, reactions: Message['reactions']) => {
    const state = get();
    const channelMessages = state.messagesByChannel[channelId] || [];
    const messageIndex = channelMessages.findIndex(m => m._id === messageId);

    if (messageIndex === -1) {
      console.warn('Message not found for reaction update:', messageId);
      return;
    }

    // Ensure reactions are in the correct format and contain valid emojis
    const validReactions = reactions?.filter(r => {
      // Check if emoji is a string and users is an array
      const hasValidStructure = r.emoji && Array.isArray(r.users);
      // Check if emoji is a valid emoji from our supported list
      const isValidEmoji = Object.values(SUPPORTED_REACTIONS).includes(r.emoji as any);
      return hasValidStructure && isValidEmoji;
    }) || [];

    console.log('Updating message reactions:', {
      messageId,
      channelId,
      reactions: validReactions,
      originalReactions: reactions
    });

    const updatedMessages = [...channelMessages];
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      reactions: validReactions
    };

    set({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: updatedMessages
      }
    });
  }
}));
