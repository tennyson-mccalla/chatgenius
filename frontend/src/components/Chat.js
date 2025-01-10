import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Message from './Message';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

function Chat() {
  const { channelId = 'general' } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);
  const [channel, setChannel] = useState(null);
  const { isDark } = useTheme();

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to messages
  useEffect(() => {
    if (!currentUser) return;

    let unsubscribe;

    const setupSubscription = async () => {
      try {
        const q = query(
          collection(db, 'channels', channelId, 'messages'),
          orderBy('timestamp', 'asc')
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          const newMessages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMessages(newMessages);
        }, (error) => {
          // Ignore permission errors during logout
          if (error.code !== 'permission-denied') {
            console.error("Error fetching messages:", error);
          }
        });
      } catch (error) {
        console.error("Error setting up subscription:", error);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      setMessages([]);
    };
  }, [channelId, currentUser]);

  // Fetch channel details
  useEffect(() => {
    if (!currentUser) return;

    const fetchChannel = async () => {
      try {
        const channelRef = doc(db, 'channels', channelId);
        const channelSnap = await getDoc(channelRef);
        if (channelSnap.exists()) {
          setChannel({
            id: channelSnap.id,
            ...channelSnap.data()
          });
        }
      } catch (error) {
        console.error("Error fetching channel:", error);
      }
    };

    fetchChannel();

    // Cleanup
    return () => {
      setChannel(null); // Clear channel on unmount
    };
  }, [channelId, currentUser]); // Add currentUser as dependency

  const insertText = (before, after, defaultText = '') => {
    const input = inputRef.current;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = newMessage;
    const selectedText = text.substring(start, end) || defaultText;

    const newText =
      text.substring(0, start) +
      before +
      selectedText +
      after +
      text.substring(end);

    setNewMessage(newText);

    // Defer focus and selection until after render
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  const formatters = [
    { label: "bold", icon: "𝐁", before: "**", after: "**", default: "bold text" },
    { label: "italic", icon: "𝑰", before: "_", after: "_", default: "italic text" },
    { label: "strikethrough", icon: "S̶", before: "~~", after: "~~", default: "strikethrough text" },
    { label: "code", icon: "⟨⟩", before: "`", after: "`", default: "code" },
    { label: "link", icon: "🔗", before: "[", after: "](url)", default: "link text" },
    { label: "list", icon: "📝", before: "\n- ", after: "", default: "list item" }
  ];

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      await addDoc(collection(db, 'channels', channelId, 'messages'), {
        text: newMessage,
        user: {
          uid: currentUser.uid,
          name: currentUser.displayName || 'Guest User',
          photoURL: currentUser.photoURL
        },
        timestamp: new Date().toISOString(),
        formatted: true
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: isDark ? '#202124' : '#ffffff',
      color: isDark ? '#e8eaed' : '#202124',
      flex: 1,
      minWidth: 0 // Prevents flex items from overflowing
    }}>
      {/* Channel header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${isDark ? '#3c4043' : '#e2e2e2'}`,
        backgroundColor: isDark ? '#292a2d' : '#ffffff'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 'bold',
          color: isDark ? '#e8eaed' : '#202124'
        }}>
          # {channel?.name || channelId}
        </h2>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        backgroundColor: isDark ? '#202124' : '#ffffff'
      }}>
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            channelId={channelId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} style={{ padding: '0 20px 20px 20px' }}>
        <div style={{
          border: `1px solid ${isDark ? '#3c4043' : '#e2e2e2'}`,
          borderRadius: '4px',
          backgroundColor: isDark ? '#292a2d' : '#ffffff'
        }}>
          {/* Formatting toolbar */}
          <div style={{
            padding: '8px 12px',
            borderBottom: `1px solid ${isDark ? '#3c4043' : '#e2e2e2'}`,
            display: 'flex',
            gap: '16px'
          }}>
            {formatters.map(({ label, icon, before, after, default: defaultText }) => (
              <button
                key={label}
                type="button"
                onClick={() => insertText(before, after, defaultText)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  opacity: 0.7,
                  transition: 'opacity 0.2s',
                  color: isDark ? '#e8eaed' : '#202124',
                }}
              >
                <span role="img" aria-label={label}>{icon}</span>
              </button>
            ))}
          </div>

          {/* Preview area */}
          {newMessage.trim() && (
            <div style={{
              padding: '8px 12px',
              borderBottom: `1px solid ${isDark ? '#3c4043' : '#e2e2e2'}`,
              fontSize: '14px',
              color: isDark ? '#9aa0a6' : '#616061',
              backgroundColor: isDark ? '#202124' : '#f8f8f8'
            }}>
              <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>Preview</div>
              <ReactMarkdown>{newMessage}</ReactMarkdown>
            </div>
          )}

          {/* Message input */}
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message #${channel?.name || channelId}`}
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            style={{
              width: '100%',
              padding: '12px',
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              backgroundColor: isDark ? '#292a2d' : sending ? '#f8f8f8' : 'white',
              color: isDark ? '#e8eaed' : '#202124',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '200px',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </form>
    </div>
  );
}

export default Chat;
