import { useState, useEffect, useRef } from 'react';
import { Input, InputGroup, InputRightElement, IconButton } from '@chakra-ui/react';
import { IoSend } from 'react-icons/io5';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useChannelStore } from '../store/channel/store';
import { useAuth } from '../store/authStore';
import { WebSocketMessageType, WebSocketErrorType } from '../types/websocket.types';

interface MessageInputProps {
  onError?: (type: WebSocketErrorType, message: string) => void;
}

export const MessageInput = ({ onError }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const { socket, isConnected } = useWebSocket();
  const { currentChannel } = useChannelStore();
  const { user } = useAuth();
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const TYPING_TIMER_LENGTH = 5000;

  const sendTypingStart = () => {
    if (!isConnected || !currentChannel || !user || isTypingRef.current) return;

    console.log('Sending typing_start:', {
      channelId: currentChannel._id,
      userId: user._id,
      username: user.username
    });

    socket?.send(WebSocketMessageType.TYPING_START, {
      channelId: currentChannel._id,
      userId: user._id,
      username: user.username
    });
    isTypingRef.current = true;
  };

  const sendTypingStop = () => {
    if (!isConnected || !currentChannel || !user || !isTypingRef.current) return;

    console.log('Sending typing_stop:', {
      channelId: currentChannel._id,
      userId: user._id,
      username: user.username
    });

    socket?.send(WebSocketMessageType.TYPING_STOP, {
      channelId: currentChannel._id,
      userId: user._id,
      username: user.username
    });
    isTypingRef.current = false;
  };

  const handleTyping = () => {
    if (!isConnected || !currentChannel || !user) return;

    // Send typing start if not already typing
    sendTypingStart();

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to send typing stop
    typingTimeoutRef.current = window.setTimeout(() => {
      sendTypingStop();
      typingTimeoutRef.current = null;
    }, TYPING_TIMER_LENGTH);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      // Send typing_stop when component unmounts
      sendTypingStop();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !currentChannel) {
      console.error('No socket or channel available');
      onError?.(WebSocketErrorType.MESSAGE_FAILED, 'No socket or channel available');
      return;
    }

    if (!message.trim()) {
      return;
    }

    try {
      socket.send(WebSocketMessageType.MESSAGE, {
        content: message,
        channelId: currentChannel._id,
      });
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      onError?.(WebSocketErrorType.MESSAGE_FAILED, 'Failed to send message');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <InputGroup>
        <Input
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          placeholder="Type a message..."
          disabled={!currentChannel}
        />
        <InputRightElement>
          <IconButton
            aria-label="Send message"
            icon={<IoSend />}
            type="submit"
            disabled={!message.trim() || !currentChannel}
          />
        </InputRightElement>
      </InputGroup>
    </form>
  );
};
