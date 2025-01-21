import { useUnreadStore } from '../unread/store';
import Logger from '../../utils/logger';

export const handleMessageRead = (data: { channelId: string }) => {
  try {
    Logger.debug('Processing message read status', {
      context: 'UnreadHandlers',
      data: {
        channelId: data.channelId,
        timestamp: new Date().toISOString()
      }
    });

    const unreadStore = useUnreadStore.getState();
    const currentUnreadCounts = unreadStore.unreadCounts;
    const previousCount = currentUnreadCounts[data.channelId] || 0;

    unreadStore.setUnreadCount(data.channelId, 0);

    Logger.debug('Updated unread count', {
      context: 'UnreadHandlers',
      data: {
        channelId: data.channelId,
        previousCount,
        newCount: 0,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    Logger.error('Failed to handle message read status', {
      context: 'UnreadHandlers',
      data: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        rawData: JSON.stringify(data).slice(0, 200)
      }
    });
  }
};
