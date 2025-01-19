import { useState, useEffect, useRef, RefObject } from 'react';

interface UseScrollBehaviorReturn {
  messagesEndRef: RefObject<HTMLDivElement>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const useScrollBehavior = (messages: any[]): UseScrollBehaviorReturn => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const scrollToBottom = () => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return {
    messagesEndRef,
    handleScroll
  };
};
