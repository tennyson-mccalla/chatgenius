import { useUnreadStore } from '../unread/store';

export const handleMessageRead = (data: { channelId: string }) => {
  const unreadStore = useUnreadStore.getState();
  unreadStore.setUnreadCount(data.channelId, 0);
};
