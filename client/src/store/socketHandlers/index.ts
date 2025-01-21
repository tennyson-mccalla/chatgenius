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
  TypingPayload
} from '../../types/websocket.types';
import { UserStatus } from '../../types/user.types';
import { useChannelStore } from '../channel/store';
import { useMessageStore } from '../message/store';
import { useUnreadStore } from '../unread/store';
import { usePresenceStore } from '../presence/store';
import { useTypingStore } from '../typing/store';
import Logger from '../../utils/logger';
import { handleChannelsLoaded, handleChannelJoined } from './channelHandlers';
import { handleMessageReceived, handleReaction } from './messageHandlers';
import { handleTyping } from './typingHandlers';
import { handleUserPresence, handleInitialPresence } from './presenceHandlers';

interface InitializeOptions {
  onInitialized?: () => void;
}

export const initializeSocketHandlers = (socket: ChatWebSocket, options?: InitializeOptions) => {
  let isInitialized = false;

  const messageHandler = (data: any) => {
    try {
      // Data is already parsed by WebSocketContext
      const { type, payload } = data;

      Logger.debug('Received WebSocket message', {
        context: 'SocketHandler',
        data: {
          type,
          hasPayload: !!payload,
          timestamp: new Date().toISOString()
        }
      });

      switch (type) {
        case WebSocketMessageType.CHANNELS_LOADED:
          handleChannelsLoaded(payload as ChannelsLoadedPayload, () => {
            if (!isInitialized) {
              isInitialized = true;
              options?.onInitialized?.();
            }
          });
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
          handleUserPresence(payload as PresencePayload);
          break;

        case WebSocketMessageType.INITIAL_PRESENCE:
          handleInitialPresence(payload as PresencePayload[]);
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
        data: {
          error: error instanceof Error ? error.message : String(error),
          rawData: data
        }
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
