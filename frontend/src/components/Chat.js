import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc, getDocs, where, limit, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Message from './Message';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import FileUpload from './FileUpload';

function Chat({ userId }) {
  const { channelId = 'general' } = useParams();
  const isDmChat = !!userId;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const { currentUser } = useAuth();
  const messagesEndRef = useRef(null);
  const [channel, setChannel] = useState(null);
  const [dmChat, setDmChat] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const { isDark } = useTheme();

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    console.log("Messages updated, count:", messages.length);
    messages.forEach((msg, i) => {
      console.log(`Message ${i}:`, msg.id, msg.text, msg.user?.name);
    });
    scrollToBottom();
  }, [messages]);

  // Subscribe to messages
  useEffect(() => {
    if (!currentUser) return;

    let unsubscribe;

    const setupSubscription = async () => {
      try {
        let q;
        
        if (isDmChat && userId) {
          // For direct messages, use a flat structure with dmId field
          console.log("Setting up DM subscription for DM ID:", userId);
          try {
            // First attempt with the full query (may require composite index)
            q = query(
              collection(db, 'dm_messages'),
              where('dmId', '==', userId),
              orderBy('timestamp', 'asc')
            );
          } catch (indexErr) {
            console.error("Index error, trying simpler query:", indexErr);
            
            // Fallback to a simpler query without ordering if index error
            try {
              q = query(
                collection(db, 'dm_messages'),
                where('dmId', '==', userId)
              );
            } catch (err) {
              console.error("Error setting up DM query:", err);
            }
          }
        } else {
          // Channel messages
          q = query(
            collection(db, 'channels', channelId, 'messages'),
            orderBy('timestamp', 'asc')
          );
        }

        console.log("Setting up message subscription with query:", 
          isDmChat ? `DM ID: ${userId}` : `Channel ID: ${channelId}`);
        
        // Force an initial fetch to validate the query and see if there are any messages
        getDocs(q).then(initialDocs => {
          console.log("Initial fetch complete, docs:", initialDocs.docs.length);
          
          if (initialDocs.docs.length > 0) {
            const initialMessages = initialDocs.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setMessages(initialMessages);
          }
        }).catch(queryError => {
          console.error("Error in initial query fetch:", queryError);
        });
        
        // Set up the real-time listener
        console.log("Creating REAL-TIME listener with query:", 
          isDmChat ? `DM ID: ${userId}` : `Channel ID: ${channelId}`);

        unsubscribe = onSnapshot(q, (snapshot) => {
          // Log what changed in this snapshot
          const changesLog = snapshot.docChanges().map(change => 
            `${change.type}: ${change.doc.id} - ${change.doc.data().text}`
          );
          console.log("REAL-TIME CHANGE detected, changes:", changesLog);
          console.log("Message snapshot received, docs:", snapshot.docs.length);
          
          const newMessages = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log("Message data:", doc.id, data);
            return {
              id: doc.id,
              ...data
            };
          });
          
          // Sort messages by timestamp
          newMessages.sort((a, b) => {
            // Handle if either timestamp is missing or undefined
            if (!a.timestamp && !b.timestamp) return 0;
            if (!a.timestamp) return -1;
            if (!b.timestamp) return 1;
            
            // Handle Firestore Timestamp objects
            const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp) || new Date(a.formattedTimestamp);
            const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp) || new Date(b.formattedTimestamp);
            
            return timeA - timeB; // Ascending order (oldest first)
          });
          
          console.log("Setting messages state with:", newMessages.length, "messages");
          // Always update the messages state, even if empty
          // This ensures we're always in sync with Firestore
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
  }, [channelId, userId, isDmChat, currentUser]);

  // Fetch channel or DM details
  useEffect(() => {
    if (!currentUser) return;

    const fetchDetails = async () => {
      try {
        if (isDmChat && userId) {
          // Fetch DM details
          const dmRef = doc(db, 'directMessages', userId);
          const dmSnap = await getDoc(dmRef);
          
          if (dmSnap.exists()) {
            const dmData = {
              id: dmSnap.id,
              ...dmSnap.data()
            };
            setDmChat(dmData);
            
            // Find the other user in the conversation
            const otherUserId = dmData.participants.find(id => id !== currentUser.uid);
            if (otherUserId) {
              // Fetch other user details
              const userRef = doc(db, 'users', otherUserId);
              const userSnap = await getDoc(userRef);
              
              if (userSnap.exists()) {
                setOtherUser({
                  id: userSnap.id,
                  ...userSnap.data()
                });
              }
            }
          }
        } else {
          // Fetch channel details
          const channelRef = doc(db, 'channels', channelId);
          const channelSnap = await getDoc(channelRef);
          
          if (channelSnap.exists()) {
            setChannel({
              id: channelSnap.id,
              ...channelSnap.data()
            });
          }
        }
      } catch (error) {
        console.error("Error fetching details:", error);
      }
    };

    fetchDetails();

    // Cleanup
    return () => {
      setChannel(null);
      setDmChat(null);
      setOtherUser(null);
    };
  }, [channelId, userId, isDmChat, currentUser]);

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

  // File upload handler
  const handleFileUploadComplete = (files) => {
    setAttachedFiles([...attachedFiles, ...files]);
    
    // Auto-add file links to message if not already there
    let updatedMessage = newMessage;
    files.forEach(file => {
      const fileLink = `\n[${file.name}](${file.url})`;
      if (!updatedMessage.includes(fileLink)) {
        updatedMessage += fileLink;
      }
    });
    setNewMessage(updatedMessage);
  };
  
  // Search messages
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Search in messages
      const messagesQuery = query(
        collection(db, 'channels', channelId, 'messages'),
        where('text', '>=', searchTerm),
        where('text', '<=', searchTerm + '\uf8ff'),
        orderBy('text'),
        limit(10)
      );
      
      const messagesSnapshot = await onSnapshot(messagesQuery, (snapshot) => {
        const results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'message'
        }));
        
        // Search in files
        const filesQuery = query(
          collection(db, 'files'),
          where('channelId', '==', channelId),
          where('name', '>=', searchTerm),
          where('name', '<=', searchTerm + '\uf8ff'),
          orderBy('name'),
          limit(10)
        );
        
        onSnapshot(filesQuery, (filesSnapshot) => {
          const fileResults = filesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            type: 'file'
          }));
          
          setSearchResults([...results, ...fileResults]);
          setIsSearching(false);
        });
      });
      
    } catch (error) {
      console.error('Error searching:', error);
      setIsSearching(false);
    }
  };
  
  // Handle search input change
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);
    
    return () => clearTimeout(delaySearch);
  }, [searchTerm]);
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && attachedFiles.length === 0) || sending) return;

    try {
      setSending(true);
      
      // Create message object
      const messageData = {
        text: newMessage.trim() || (attachedFiles.length > 0 ? 'Shared files' : ''),
        user: {
          uid: currentUser.uid,
          name: currentUser.displayName || 'Guest User',
          photoURL: currentUser.photoURL
        },
        timestamp: serverTimestamp(), // Use Firebase server timestamp for consistent ordering
        formattedTimestamp: new Date().toISOString(), // Keep formatted version for display
        formatted: true
      };
      
      // Add file attachments if any
      if (attachedFiles.length > 0) {
        messageData.attachments = attachedFiles.map(file => ({
          id: file.id,
          name: file.name,
          url: file.url,
          type: file.type,
          size: file.size
        }));
      }
      
      // Send message to the appropriate collection
      if (isDmChat && userId) {
        try {
          console.log("Sending DM message to:", userId);
          
          // Add dmId field to message data
          messageData.dmId = userId;
          
          // Send to dm_messages collection (flat structure)
          const messageRef = await addDoc(collection(db, 'dm_messages'), messageData);
          console.log("Created DM message:", messageRef.id);
          console.log("Message data sent:", messageData);
          
          // Update lastMessage and lastActivity in the DM document
          console.log("Updating DM document:", userId);
          await updateDoc(doc(db, 'directMessages', userId), {
            lastMessage: messageData.text,
            lastActivity: serverTimestamp()
          });
          console.log("DM document updated with last message");
          
          // Fetch all messages to verify
          // Check if the messages are actually being written to Firestore
          console.log("Checking all messages in dm_messages collection");
          const allMessagesQuery = query(
            collection(db, 'dm_messages')
          );
          const allMessagesSnap = await getDocs(allMessagesQuery);
          console.log("Total messages in collection:", allMessagesSnap.size);
          
          // Now check messages for this DM conversation
          const dmMessagesQuery = query(
            collection(db, 'dm_messages'),
            where('dmId', '==', userId)
          );
          
          // Also create the composite index if it doesn't exist
          console.log("Make sure to create a composite index for:");
          console.log("Collection: dm_messages");
          console.log("Fields: dmId (Ascending) and timestamp (Ascending)");
          const messagesSnap = await getDocs(dmMessagesQuery);
          console.log("Current messages in DM:", messagesSnap.size);
          messagesSnap.forEach(doc => {
            console.log("- Message:", doc.id, doc.data());
          });
        } catch (dmError) {
          console.error("Error sending DM:", dmError, dmError.stack);
          alert("Error sending DM: " + dmError.message);
          throw dmError;
        }
      } else {
        // Send to channel
        await addDoc(collection(db, 'channels', channelId, 'messages'), messageData);
      }

      // Reset state
      setNewMessage('');
      setAttachedFiles([]);
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
      {/* Channel or DM header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${isDark ? '#3c4043' : '#e2e2e2'}`,
        backgroundColor: isDark ? '#292a2d' : '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {isDmChat && otherUser && (
            <img 
              src={otherUser.photoURL || `https://ui-avatars.com/api/?name=${otherUser.displayName || 'User'}&background=random`}
              alt={otherUser.displayName}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '2px solid #3F2F4F'
              }}
            />
          )}
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            color: isDark ? '#e8eaed' : '#202124',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {isDmChat ? (
              otherUser ? otherUser.displayName : 'Direct Message'
            ) : (
              <><span>#</span>{channel?.name || channelId}</>
            )}
          </h2>
        </div>
        
        {/* Search input */}
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '30%',
          maxWidth: '300px'
        }}>
          <input
            type="text"
            placeholder="Search messages & files"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              backgroundColor: isDark ? '#3c4043' : '#f1f3f4',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 12px',
              color: isDark ? '#e8eaed' : '#202124',
              width: '100%',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          {isSearching && (
            <span style={{ 
              color: isDark ? '#e8eaed' : '#202124', 
              fontSize: '14px'
            }}>
              ⏳
            </span>
          )}
        </div>
      </div>
      
      {/* Search results */}
      {searchResults.length > 0 && (
        <div style={{
          padding: '16px',
          backgroundColor: isDark ? '#292a2d' : '#f8f9fa',
          borderBottom: `1px solid ${isDark ? '#3c4043' : '#e2e2e2'}`,
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '16px',
            color: isDark ? '#e8eaed' : '#202124'
          }}>
            Search Results ({searchResults.length})
          </h3>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px' 
          }}>
            {searchResults.map(result => (
              <div 
                key={result.id} 
                style={{
                  padding: '8px',
                  backgroundColor: isDark ? '#202124' : '#ffffff',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  if (result.type === 'message') {
                    // Scroll to message
                    const messageEl = document.getElementById(`message-${result.id}`);
                    if (messageEl) {
                      messageEl.scrollIntoView({ behavior: 'smooth' });
                      messageEl.style.backgroundColor = isDark ? '#3c404380' : '#f1f3f480';
                      setTimeout(() => {
                        messageEl.style.transition = 'background-color 1s';
                        messageEl.style.backgroundColor = 'transparent';
                      }, 100);
                    }
                  } else if (result.type === 'file') {
                    // Open file
                    window.open(result.url, '_blank');
                  }
                  
                  // Clear search
                  setSearchTerm('');
                  setSearchResults([]);
                }}
              >
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '20px' }}>
                    {result.type === 'message' ? '💬' : '📄'}
                  </span>
                  <div>
                    <div style={{
                      fontWeight: 'bold',
                      color: isDark ? '#e8eaed' : '#202124'
                    }}>
                      {result.type === 'message' 
                        ? result.user?.name || 'Unknown User'
                        : result.name
                      }
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: isDark ? '#9aa0a6' : '#616061',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '500px'
                    }}>
                      {result.type === 'message'
                        ? result.text.substring(0, 100)
                        : `File: ${result.category} - ${new Date(result.uploadedAt?.toDate()).toLocaleString()}`
                      }
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            gap: '16px',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', gap: '16px' }}>
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
            
            {/* File upload button */}
            <FileUpload 
              channelId={channelId} 
              onUploadComplete={handleFileUploadComplete} 
            />
          </div>
          
          {/* Display attached files */}
          {attachedFiles.length > 0 && (
            <div style={{
              padding: '8px 12px',
              borderBottom: `1px solid ${isDark ? '#3c4043' : '#e2e2e2'}`,
              backgroundColor: isDark ? '#202124' : '#f8f8f8'
            }}>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px' 
              }}>
                {attachedFiles.map((file, index) => (
                  <div 
                    key={file.id || index} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: isDark ? '#3c4043' : '#e2e2e2',
                      fontSize: '14px'
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>
                      {file.type?.includes('image') ? '🖼️' : 
                       file.type?.includes('pdf') || file.type?.includes('document') ? '📄' : 
                       file.type?.includes('video') ? '🎬' : 
                       file.type?.includes('audio') ? '🎵' : '📁'}
                    </span>
                    <span style={{
                      maxWidth: '150px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: isDark ? '#e8eaed' : '#202124'
                    }}>
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updatedFiles = [...attachedFiles];
                        updatedFiles.splice(index, 1);
                        setAttachedFiles(updatedFiles);
                      }}
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        padding: '0 4px',
                        color: isDark ? '#9aa0a6' : '#5f6368',
                        fontSize: '14px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
