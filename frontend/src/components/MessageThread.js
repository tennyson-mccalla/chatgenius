import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Message from './Message';

function MessageThread({ parentMessage }) {
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    let unsubscribe;

    const setupListener = async () => {
      try {
        setIsLoading(true);
        const messagesRef = collection(db, 'threads');

        // First, get messages without ordering while index builds
        const initialQuery = query(
          messagesRef,
          where('parentMessageId', '==', parentMessage.id)
        );

        const snapshot = await getDocs(initialQuery);
        const threadData = snapshot.docs.map(doc => ({
          id: doc.id,
          channelId: parentMessage.channelId,
          ...doc.data()
        }));
        setReplies(threadData);

        // Then set up real-time listener with ordering
        const orderedQuery = query(
          messagesRef,
          where('parentMessageId', '==', parentMessage.id),
          orderBy('timestamp', 'asc')
        );

        unsubscribe = onSnapshot(orderedQuery,
          (snapshot) => {
            const threadData = snapshot.docs.map(doc => ({
              id: doc.id,
              channelId: parentMessage.channelId,
              ...doc.data()
            }));
            setReplies(threadData);
            setIsLoading(false);
          },
          (error) => {
            // If index isn't ready, we'll keep using unordered data
            if (error.code === 'failed-precondition') {
              console.log('Index still building, using unordered data');
            } else {
              console.error('Thread listener error:', error);
            }
          }
        );
      } catch (error) {
        console.error('Error setting up thread listener:', error);
        setIsLoading(false);
      }
    };

    setupListener();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [parentMessage.id, parentMessage.channelId]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      const threadsRef = collection(db, 'threads');
      const replyData = {
        parentMessageId: parentMessage.id,
        text: replyText.trim(),
        user: {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL
        },
        timestamp: serverTimestamp(),
        channelId: parentMessage.channelId
      };

      const replyRef = await addDoc(threadsRef, replyData);
      console.log("Reply sent successfully. ID:", replyRef.id);

      // Update reply count on parent message
      if (parentMessage.channelId) {
        const messageRef = doc(db, 'channels', parentMessage.channelId, 'messages', parentMessage.id);
        await updateDoc(messageRef, {
          replyCount: increment(1)
        });
      }

      setReplyText('');
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply: ' + error.message);
    }
  };

  return (
    <div style={{
      borderLeft: '2px solid #522653',
      marginLeft: '44px',
      paddingLeft: '16px',
      marginTop: '8px'
    }}>
      <div style={{
        marginBottom: '16px',
        fontSize: '18px',
        fontWeight: '700',
        color: '#CFC3CF'
      }}>
        Thread
        {isLoading && <span style={{ fontSize: '14px', marginLeft: '8px' }}>(Loading...)</span>}
      </div>

      {/* Thread replies */}
      <div style={{ marginBottom: '16px' }}>
        {replies.map(reply => (
          <Message
            key={reply.id}
            message={reply}
            channelId={parentMessage.channelId}
            showThread={false}
          />
        ))}
      </div>

      {/* Reply input */}
      <form onSubmit={handleReply} style={{
        marginTop: '16px',
        display: 'flex',
        gap: '8px'
      }}>
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Reply in thread..."
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #522653',
            backgroundColor: 'transparent',
            color: '#CFC3CF'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '8px 16px',
            backgroundColor: '#522653',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default MessageThread;
