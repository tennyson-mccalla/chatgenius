import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Message from './Message';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';

function Chat() {
  const { channelId = 'general' } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);
  const [channel, setChannel] = useState(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to messages
  useEffect(() => {
    const q = query(
      collection(db, 'channels', channelId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(newMessages);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [channelId]);

  // Fetch channel details
  useEffect(() => {
    const fetchChannel = async () => {
      const channelRef = doc(db, 'channels', channelId);
      const channelSnap = await getDoc(channelRef);
      if (channelSnap.exists()) {
        setChannel({
          id: channelSnap.id,
          ...channelSnap.data()
        });
      }
    };

    fetchChannel();
  }, [channelId]);

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Channel header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e2e2e2',
        backgroundColor: '#fff'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 'bold'
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
        gap: '4px'
      }}>
        {messages.map(message => (
          <Message key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} style={{ padding: '0 20px 20px 20px' }}>
        <div style={{
          border: '1px solid #e2e2e2',
          borderRadius: '4px',
          backgroundColor: '#ffffff'
        }}>
          {/* Formatting toolbar */}
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid #e2e2e2',
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
                  ':hover': { opacity: 1 }
                }}
              >
                <span role="img" aria-label={label}>{icon}</span>
              </button>
            ))}
          </div>

          {/* Preview area - only show if there's content */}
          {newMessage.trim() && (
            <div style={{
              padding: '8px 12px',
              borderBottom: '1px solid #e2e2e2',
              fontSize: '14px',
              color: '#616061',
              backgroundColor: '#f8f8f8'
            }}>
              <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>Preview</div>
              <ReactMarkdown>{newMessage}</ReactMarkdown>
            </div>
          )}

          {/* Replace input with textarea */}
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
              backgroundColor: sending ? '#f8f8f8' : 'white',
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
