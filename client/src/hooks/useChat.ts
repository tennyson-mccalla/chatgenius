import { useCallback, useEffect, useRef } from 'react';
import { useWebSocket, useWebSocketMessage } from '../contexts/WebSocketContext';
import {
  MessageReceivedPayload,
  TypingPayload,
  WebSocketMessageType,
  WebSocketMessage
} from '../types/websocket.types';

export function useMessageSubscription(
  onMessage: (message: MessageReceivedPayload) => void
) {
  useWebSocketMessage<MessageReceivedPayload>(
    WebSocketMessageType.MESSAGE_RECEIVED,
    onMessage
  );
}

export function useSendMessage() {
  const { send, isConnected } = useWebSocket();

  const sendMessage = useCallback(
    (message: Omit<MessageReceivedPayload['message'], '_id' | 'createdAt'>) => {
      if (isConnected) {
        send(WebSocketMessageType.MESSAGE_RECEIVED, message);
      }
    },
    [send, isConnected]
  );

  return { sendMessage, isConnected };
}

export function useTypingIndicator(channelId: string) {
  const { send } = useWebSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startTyping = useCallback(() => {
    send<TypingPayload>(WebSocketMessageType.TYPING_START, {
      channelId,
      userId: '', // This should be filled by the server
      username: '' // This should be filled by the server
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      send<TypingPayload>(WebSocketMessageType.TYPING_STOP, {
        channelId,
        userId: '', // This should be filled by the server
        username: '' // This should be filled by the server
      });
      typingTimeoutRef.current = null;
    }, 3000);
  }, [send, channelId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { startTyping };
}

export function useChannelTypingIndicator(
  channelId: string,
  onTypingChange: (typingUsers: string[]) => void
) {
  const typingUsersRef = useRef<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const clearUserTyping = useCallback((username: string) => {
    typingUsersRef.current.delete(username);
    onTypingChange(Array.from(typingUsersRef.current));
  }, [onTypingChange]);

  useWebSocketMessage<TypingPayload>(
    WebSocketMessageType.TYPING_START,
    useCallback(({ username, channelId: messageChannelId }) => {
      if (messageChannelId !== channelId) return;

      typingUsersRef.current.add(username);
      onTypingChange(Array.from(typingUsersRef.current));

      const existingTimeout = timeoutsRef.current.get(username);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      timeoutsRef.current.set(
        username,
        setTimeout(() => {
          clearUserTyping(username);
          timeoutsRef.current.delete(username);
        }, 3000)
      );
    }, [channelId, clearUserTyping, onTypingChange])
  );

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current.clear();
      typingUsersRef.current.clear();
    };
  }, []);
}
