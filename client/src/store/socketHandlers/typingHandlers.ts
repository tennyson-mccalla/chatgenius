import { useTypingStore } from '../typing/store';

interface TypingData {
  userId: string;
  username: string;
  channelId: string;
}

export const handleUserTyping = (data: TypingData) => {
  useTypingStore.getState().addTypingUser(data.channelId, {
    userId: data.userId,
    username: data.username
  });
};

export const handleUserStoppedTyping = (data: { userId: string; channelId: string }) => {
  useTypingStore.getState().removeTypingUser(data.channelId, data.userId);
};
