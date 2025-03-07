import { useTheme } from '../contexts/ThemeContext';
import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from 'react';
import MessageThread from './MessageThread';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, limit, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ReactionPicker from './ReactionPicker';
import { useAuth } from '../contexts/AuthContext';

function Message({ message, channelId, showThread = false }) {
  // Debug message rendering
  console.log("Rendering message:", message.id, message.text, message.user?.name);
  const { isDark } = useTheme();
  const { currentUser } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const [hasThread, setHasThread] = useState(false);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [threadPreview, setThreadPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [reactions, setReactions] = useState({});  // Store reactions as {emoji: count}
  const [userReactions, setUserReactions] = useState({}); // Store user's reactions as {emoji: docId}

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    // Handle both Firestore Timestamp objects and string timestamps
    const date = timestamp?.toDate?.() || new Date(timestamp);

    // Check if date is valid before formatting
    if (isNaN(date.getTime())) {
      // Try using formattedTimestamp as a fallback
      if (message.formattedTimestamp) {
        const fallbackDate = new Date(message.formattedTimestamp);
        if (!isNaN(fallbackDate.getTime())) {
          return fallbackDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      return '';
    }

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleReactions = () => setShowReactions(prev => !prev);
  const toggleThread = () => setIsThreadOpen(prev => !prev);
  
  // Handle emoji reaction selection - toggle on/off
  const handleReactionSelect = async (emoji) => {
    try {
      // Close the reaction picker
      setShowReactions(false);
      
      // Check if user already reacted with this emoji
      if (userReactions[emoji]) {
        // User already reacted - remove the reaction
        const reactionDocId = userReactions[emoji];
        await deleteDoc(doc(db, 'reactions', reactionDocId));
        
        // Update local state
        setReactions(prev => {
          const newReactions = {...prev};
          newReactions[emoji] = Math.max((newReactions[emoji] || 1) - 1, 0);
          
          // Remove emoji entirely if count is 0
          if (newReactions[emoji] === 0) {
            delete newReactions[emoji];
          }
          return newReactions;
        });
        
        // Remove from user reactions
        setUserReactions(prev => {
          const newUserReactions = {...prev};
          delete newUserReactions[emoji];
          return newUserReactions;
        });
        
        console.log(`Removed reaction ${emoji} from message ${message.id}`);
      } else {
        // Add new reaction
        const newReactionRef = await addDoc(collection(db, 'reactions'), {
          messageId: message.id,
          channelId: channelId || message.channelId,
          emoji: emoji,
          userId: currentUser.uid,
          userName: currentUser.displayName || 'Anonymous User',
          userPhotoURL: currentUser.photoURL,
          timestamp: new Date()
        });
        
        // Update local state with the new reaction
        setReactions(prev => {
          const newReactions = {...prev};
          newReactions[emoji] = (newReactions[emoji] || 0) + 1;
          return newReactions;
        });
        
        // Add to user reactions
        setUserReactions(prev => {
          return {
            ...prev,
            [emoji]: newReactionRef.id
          };
        });
        
        console.log(`Added reaction ${emoji} to message ${message.id}`);
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

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

  // Fetch reactions for this message
  useEffect(() => {
    const fetchReactions = async () => {
      if (!currentUser) return;
      
      try {
        const reactionsRef = collection(db, 'reactions');
        const q = query(reactionsRef, where('messageId', '==', message.id));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const reactionCounts = {};
          const userReacts = {};
          
          snapshot.forEach(docSnapshot => {
            const reaction = docSnapshot.data();
            const emoji = reaction.emoji;
            
            // Count total reactions
            reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
            
            // Track user's own reactions
            if (reaction.userId === currentUser.uid) {
              userReacts[emoji] = docSnapshot.id;
            }
          });
          
          setReactions(reactionCounts);
          setUserReactions(userReacts);
        }
      } catch (error) {
        console.error('Error fetching reactions:', error);
      }
    };
    
    fetchReactions();
  }, [message.id, currentUser]);

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
    <div 
      id={`message-${message.id}`}
      style={{
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

      {/* Display existing reactions */}
      {Object.keys(reactions).length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          paddingLeft: '44px',
          marginTop: '4px'
        }}>
          {Object.entries(reactions).map(([emoji, count]) => (
            <div 
              key={emoji}
              onClick={() => handleReactionSelect(emoji)}
              style={{
                display: 'flex',
                alignItems: 'center',
                background: userReactions[emoji] 
                  ? (isDark ? 'rgba(230, 210, 230, 0.2)' : 'rgba(82, 38, 83, 0.1)') 
                  : (isDark ? 'rgba(240, 240, 240, 0.1)' : 'rgba(0, 0, 0, 0.05)'),
                padding: '2px 6px',
                borderRadius: '12px',
                fontSize: '14px',
                cursor: 'pointer',
                border: userReactions[emoji] ? `1px solid ${isDark ? '#9AA0A6' : '#CFC3CF'}` : 'none'
              }}
            >
              <span style={{marginRight: '4px'}}>{emoji}</span>
              <span style={{fontSize: '12px'}}>{count}</span>
            </div>
          ))}
        </div>
      )}
      
      <div style={{
        marginTop: '4px',
        display: 'flex',
        gap: '8px',
        paddingLeft: '44px'
      }}>
        {!showReactions && (
          <button
            onClick={toggleReactions}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '4px',
              color: '#CFC3CF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: '#CFC3CF'}}>
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
          </button>
        )}
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

      {showReactions && <ReactionPicker message={message} onReactionSelect={handleReactionSelect} />}
      {isThreadOpen && <MessageThread parentMessage={messageWithChannel} />}
    </div>
  );
}

export default Message;
