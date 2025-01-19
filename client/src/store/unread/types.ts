import { ChatWebSocket } from '../../lib/ChatWebSocket';

export interface UnreadState {
  unreadCounts: Record<string, number>;
  initialized: boolean;
}

export interface UnreadActions {
  setUnreadCount: (channelId: string, count: number) => void;
  incrementUnread: (channelId: string) => void;
  markChannelAsRead: (channelId: string) => Promise<void>;
  fetchUnreadCounts: () => Promise<void>;
  initializeUnreadSocket: (socket: ChatWebSocket) => (() => void) | undefined;
  cleanup: () => void;
}
