export interface TypingUser {
  userId: string;
  username: string;
}

export interface TypingState {
  typingUsers: { [channelId: string]: TypingUser[] };
}

export interface TypingActions {
  addTypingUser: (channelId: string, user: TypingUser) => void;
  removeTypingUser: (channelId: string, userId: string) => void;
  clearTypingUsers: (channelId: string) => void;
}
