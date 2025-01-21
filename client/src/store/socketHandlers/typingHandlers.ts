import { useTypingStore } from '../typing/store';
import { TypingPayload } from '../../types/websocket.types';
import Logger from '../../utils/logger';

export const handleTyping = (payload: TypingPayload, isStarting: boolean) => {
  try {
    Logger.debug('Processing typing indicator', {
      context: 'TypingHandlers',
      data: {
        userId: payload.userId,
        username: payload.username,
        channelId: payload.channelId,
        isStarting,
        timestamp: new Date().toISOString()
      }
    });

    const typingStore = useTypingStore.getState();
    if (isStarting) {
      typingStore.addTypingUser(payload.channelId, {
        userId: payload.userId,
        username: payload.username
      });

      Logger.debug('Added typing user', {
        context: 'TypingHandlers',
        data: {
          userId: payload.userId,
          username: payload.username,
          channelId: payload.channelId,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      typingStore.removeTypingUser(payload.channelId, payload.userId);

      Logger.debug('Removed typing user', {
        context: 'TypingHandlers',
        data: {
          userId: payload.userId,
          username: payload.username,
          channelId: payload.channelId,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    Logger.error('Failed to handle typing indicator', {
      context: 'TypingHandlers',
      data: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        rawData: JSON.stringify(payload).slice(0, 200)
      }
    });
  }
};
