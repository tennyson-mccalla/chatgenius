import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, getDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

function DirectMessages() {
  const [dms, setDms] = useState([]);
  const [showNewDmDialog, setShowNewDmDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { userId } = useParams();

  // Fetch direct message conversations
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'directMessages'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastActivity', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dmData = [];
      
      snapshot.forEach(doc => {
        dmData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setDms(dmData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Search for users
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    // Use a simpler query to find all users
    const q = query(
      collection(db, 'users')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(user => user.id !== currentUser.uid) // Exclude current user
        .filter(user => {
          // Filter by search term if provided
          if (!searchTerm) return true;
          const name = user.displayName || '';
          return name.toLowerCase().includes(searchTerm.toLowerCase());
        });
      
      console.log('Search results:', users);
      setSearchResults(users);
    });

    return () => unsubscribe();
  }, [searchTerm, currentUser]);

  // Start or open direct message
  const startDirectMessage = async (user) => {
    try {
      console.log("Starting DM with user:", user);
      
      // Check if a DM already exists
      const q = query(
        collection(db, 'directMessages'),
        where('participants', 'array-contains', currentUser.uid)
      );
      
      // Using getDocs instead of onSnapshot for this one-time check
      const querySnapshot = await getDocs(q);
      let existingDm = null;
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(user.id)) {
          existingDm = { id: doc.id, ...data };
        }
      });
      
      if (existingDm) {
        console.log("Found existing DM:", existingDm.id);
        // DM exists, navigate to it
        navigate(`/dm/${existingDm.id}`);
      } else {
        // Create a new DM
        console.log("Creating new DM with:", user.id);
        const dmData = {
          participants: [currentUser.uid, user.id],
          participantDetails: {
            [currentUser.uid]: {
              displayName: currentUser.displayName || 'You',
              photoURL: currentUser.photoURL
            },
            [user.id]: {
              displayName: user.displayName || 'Guest User',
              photoURL: user.photoURL
            }
          },
          createdAt: serverTimestamp(),
          lastActivity: serverTimestamp(),
          lastMessage: 'Start a conversation'
        };
        
        console.log("DM data to create:", dmData);
        const dmRef = await addDoc(collection(db, 'directMessages'), dmData);
        console.log("Created DM with ID:", dmRef.id);
        
        navigate(`/dm/${dmRef.id}`);
      }
      
      setShowNewDmDialog(false);
      setSearchTerm('');
    } catch (error) {
      console.error('Error creating direct message:', error);
      alert('Error creating conversation: ' + error.message);
    }
  };

  // Get the other participant's name from a DM
  const getOtherParticipantName = (dm) => {
    if (!dm.participantDetails) return 'Unknown User';
    
    const otherParticipantId = dm.participants.find(p => p !== currentUser.uid);
    return dm.participantDetails[otherParticipantId]?.displayName || 'Unknown User';
  };

  // Get the other participant's photo from a DM
  const getOtherParticipantPhoto = (dm) => {
    if (!dm.participantDetails) return null;
    
    const otherParticipantId = dm.participants.find(p => p !== currentUser.uid);
    return dm.participantDetails[otherParticipantId]?.photoURL;
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{
        padding: '0 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <div style={{
          color: '#CFC3CF',
          fontSize: '13px',
          fontWeight: '500',
          letterSpacing: '0.8px'
        }}>
          DIRECT MESSAGES
        </div>
        <button 
          onClick={() => setShowNewDmDialog(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#CFC3CF',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          +
        </button>
      </div>
      
      {/* DM list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {dms.map(dm => (
          <button
            key={dm.id}
            onClick={() => navigate(`/dm/${dm.id}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 16px',
              background: userId === dm.id ? 'rgba(255,255,255,0.1)' : 'none',
              border: 'none',
              color: userId === dm.id ? '#ffffff' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              fontSize: '16px'
            }}
          >
            <div style={{ position: 'relative', marginRight: '8px' }}>
              <img 
                src={getOtherParticipantPhoto(dm) || `https://ui-avatars.com/api/?name=${getOtherParticipantName(dm)}&background=random`} 
                alt={getOtherParticipantName(dm)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%'
                }}
              />
              <div style={{
                position: 'absolute',
                right: '0',
                bottom: '0',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: dm.online ? '#2ecc71' : 'transparent',
                border: dm.online ? '1px solid #1e1e1e' : 'none'
              }} />
            </div>
            {getOtherParticipantName(dm)}
          </button>
        ))}
      </div>

      {/* New DM Dialog */}
      {showNewDmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: isDark ? '#2D2D2D' : '#FFFFFF',
            borderRadius: '8px',
            padding: '20px',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ 
              color: isDark ? '#FFFFFF' : '#000000',
              marginBottom: '16px'
            }}>
              New Message
            </h2>
            
            <input
              type="text"
              placeholder="Search for users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '4px',
                border: `1px solid ${isDark ? '#555555' : '#CCCCCC'}`,
                backgroundColor: isDark ? '#3D3D3D' : '#FFFFFF',
                color: isDark ? '#FFFFFF' : '#000000',
                marginBottom: '16px'
              }}
            />
            
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              marginBottom: '16px'
            }}>
              {searchResults.map(user => (
                <div
                  key={user.id}
                  onClick={() => startDirectMessage(user)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: isDark ? '#3D3D3D' : '#F5F5F5',
                    marginBottom: '8px'
                  }}
                >
                  <img
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`}
                    alt={user.displayName}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%'
                    }}
                  />
                  <div style={{ 
                    color: isDark ? '#FFFFFF' : '#000000'
                  }}>
                    {user.displayName}
                    {user.email && <div style={{ 
                      fontSize: '12px',
                      color: isDark ? '#BBBBBB' : '#777777'
                    }}>
                      {user.email}
                    </div>}
                  </div>
                </div>
              ))}
              
              {searchTerm.length >= 2 && searchResults.length === 0 && (
                <div style={{ 
                  color: isDark ? '#BBBBBB' : '#777777',
                  textAlign: 'center',
                  padding: '16px'
                }}>
                  No users found
                </div>
              )}
              
              {searchTerm.length < 2 && (
                <div style={{ 
                  color: isDark ? '#BBBBBB' : '#777777',
                  textAlign: 'center',
                  padding: '16px'
                }}>
                  Type at least 2 characters to search
                </div>
              )}
            </div>
            
            <div style={{ 
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowNewDmDialog(false);
                  setSearchTerm('');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: isDark ? '#555555' : '#EEEEEE',
                  color: isDark ? '#FFFFFF' : '#000000',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DirectMessages;
