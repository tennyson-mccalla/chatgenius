import { useTheme } from '../contexts/ThemeContext';
import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from 'react';
import MessageThread from './MessageThread';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import ReactionPicker from './ReactionPicker';

function Message({ message, channelId, showThread = false }) {
  const { isDark } = useTheme();
  const [showReactions, setShowReactions] = useState(false);
  const [hasThread, setHasThread] = useState(false);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [threadPreview, setThreadPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    // Handle both Firestore Timestamp objects and string timestamps
    const date = timestamp?.toDate?.() || new Date(timestamp);

    // Check if date is valid before formatting
    if (isNaN(date.getTime())) return '';

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleReactions = () => setShowReactions(prev => !prev);
  const toggleThread = () => setIsThreadOpen(prev => !prev);

  useEffect(() => {
    const checkThread = async () => {
      try {
        const threadRef = collection(db, 'threads');
        const q = query(threadRef, where('parentMessageId', '==', message.id));
        const snapshot = await getDocs(q);
        setHasThread(!snapshot.empty);

        if (!message.replyCount && !snapshot.empty && message.channelId) {
          const messageRef = doc(db, 'channels', message.channelId, 'messages', message.id);
          await updateDoc(messageRef, {
            replyCount: snapshot.size
          });
        }
      } catch (error) {
        console.error('Error checking thread:', error);
      }
    };
    checkThread();
  }, [message.id, message.channelId, message.replyCount]);

  useEffect(() => {
    const fetchThreadPreview = async () => {
      if (message.replyCount) {
        setIsLoadingPreview(true);
        try {
          const threadRef = collection(db, 'threads');
          // First try with descending order
          const q = query(
            threadRef,
            where('parentMessageId', '==', message.id),
            orderBy('timestamp', 'desc'),
            limit(1)
          );

          try {
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              setThreadPreview(snapshot.docs[0].data());
              setHasThread(true);
            }
          } catch (error) {
            // If index isn't ready, fall back to unordered query
            if (error.code === 'failed-precondition') {
              const fallbackQuery = query(
                threadRef,
                where('parentMessageId', '==', message.id),
                limit(1)
              );
              const fallbackSnapshot = await getDocs(fallbackQuery);
              if (!fallbackSnapshot.empty) {
                setThreadPreview(fallbackSnapshot.docs[0].data());
                setHasThread(true);
              }
            } else {
              console.error('Error fetching thread preview:', error);
            }
          }
        } finally {
          setIsLoadingPreview(false);
        }
      }
    };
    fetchThreadPreview();
  }, [message.id, message.replyCount]);

  const messageWithChannel = {
    ...message,
    channelId: channelId || message.channelId
  };

  // Define theme-aware colors
  const colors = {
    threadText: isDark ? '#E6D2E6' : '#522653',
    threadBackground: isDark ? 'rgba(230, 210, 230, 0.1)' : 'rgba(82, 38, 83, 0.1)',
    messageBackground: isDark ? 'rgba(230, 210, 230, 0.05)' : 'rgba(82, 38, 83, 0.05)',
    previewText: isDark ? '#CFC3CF' : '#616061'
  };

  return (
    <div style={{
      padding: '8px 20px',
      position: 'relative',
      backgroundColor: hasThread ? colors.messageBackground : 'transparent',
      borderRadius: '4px'
    }}>
      <div style={{
        padding: '8px 20px',
        display: 'flex',
        gap: '12px',
        backgroundColor: isDark ? '#202124' : '#ffffff',
        '&:hover': {
          backgroundColor: isDark ? '#292a2d' : '#f8f9fa'
        }
      }}>
        <img
          src={message.user.photoURL || `https://ui-avatars.com/api/?name=${message.user.name}&background=random`}
          alt={message.user.name}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '4px',
            flexShrink: 0
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '4px' }}>
            <span style={{
              fontWeight: 'bold',
              marginRight: '8px',
              color: isDark ? '#e8eaed' : '#202124'
            }}>
              {message.user.name}
            </span>
            <span style={{
              fontSize: '12px',
              color: isDark ? '#9aa0a6' : '#5f6368'
            }}>
              {formatTimestamp(message.timestamp)}
            </span>
            {hasThread && (
              <span style={{
                marginLeft: '8px',
                color: '#522653',
                fontSize: '12px'
              }}>
                🧵
              </span>
            )}
          </div>
          <div style={{
            color: isDark ? '#e8eaed' : '#202124',
            lineHeight: '1.4'
          }}>
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>

          {(threadPreview || isLoadingPreview) && !isThreadOpen && (
            <div
              style={{
                marginTop: '4px',
                padding: '4px 8px',
                borderLeft: `2px solid ${colors.threadText}`,
                fontSize: '13px',
                color: colors.previewText,
                cursor: 'pointer'
              }}
              onClick={() => setIsThreadOpen(true)}
            >
              <span style={{ color: colors.threadText }}>
                {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
              </span>
              {isLoadingPreview ? (
                <span style={{ marginLeft: '8px' }}>Loading preview...</span>
              ) : threadPreview && (
                <span style={{ marginLeft: '8px' }}>
                  • Latest: "{threadPreview.text}" from {threadPreview.user?.displayName || 'Unknown'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{
        marginTop: '4px',
        display: 'flex',
        gap: '8px',
        paddingLeft: '44px'
      }}>
        <button
          onClick={toggleReactions}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            color: '#CFC3CF'
          }}
        >
          😀
        </button>
        <button
          onClick={() => setIsThreadOpen(prev => !prev)}
          style={{
            border: 'none',
            background: hasThread ? colors.threadBackground : 'none',
            cursor: 'pointer',
            padding: '2px 8px',
            borderRadius: '4px',
            color: hasThread ? colors.threadText : '#CFC3CF',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {hasThread ? (
            <>
              <span>🧵</span>
              <span>{message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}</span>
            </>
          ) : (
            'Reply in thread'
          )}
        </button>
      </div>

      {showReactions && <ReactionPicker message={message} />}
      {isThreadOpen && <MessageThread parentMessage={messageWithChannel} />}
    </div>
  );
}

export default Message;
