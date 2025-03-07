import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, where, Timestamp } from 'firebase/firestore';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import DirectMessages from './DirectMessages';

function Sidebar() {
  const [channels, setChannels] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isChannelsExpanded, setIsChannelsExpanded] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { channelId } = useParams();

  // Fetch channels
  useEffect(() => {
    const q = query(collection(db, 'channels'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const channelData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChannels(channelData);
    });
    return () => unsubscribe();
  }, []);

  // Fetch online users
  useEffect(() => {
    const q = query(
      collection(db, 'presence'),
      where('online', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const twoMinutesAgo = now - (2 * 60 * 1000);

      const users = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(user => {
          const lastUpdated = user.lastUpdated?.toMillis();
          return lastUpdated && lastUpdated > twoMinutesAgo;
        });

      console.log('Online users:', users); // Debug log
      setOnlineUsers(users);
    });
    return () => unsubscribe();
  }, []);

  const [isAIExpanded, setIsAIExpanded] = useState(true);
  
  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      color: '#ffffff',
      padding: '16px 0',
    }}>
      {/* AI Tools section */}
      <div style={{ padding: '0 16px', marginBottom: '24px' }}>
        <div
          onClick={() => setIsAIExpanded(!isAIExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            marginBottom: '12px',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            style={{
              transform: `rotate(${isAIExpanded ? '90deg' : '0deg'})`,
              transition: 'transform 0.2s ease'
            }}
          >
            <path
              fill="currentColor"
              d="M8 5v14l11-7z"
            />
          </svg>
          <h2 style={{
            fontSize: '14px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.7)',
            margin: 0,
          }}>
            AI Tools
          </h2>
        </div>

        {isAIExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => navigate('/ai/docsearch')}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 12px',
                background: location.pathname === '/ai/docsearch' ? 'rgba(255,255,255,0.1)' : 'none',
                border: 'none',
                borderRadius: '4px',
                color: location.pathname === '/ai/docsearch' ? '#ffffff' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                fontSize: '16px',
              }}
            >
              <span role="img" aria-label="search" style={{ marginRight: '8px' }}>🔍</span> Document Search
            </button>
          </div>
        )}
      </div>
      
      {/* Channels section */}
      <div style={{ padding: '0 16px' }}>
        <div
          onClick={() => setIsChannelsExpanded(!isChannelsExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            marginBottom: '12px',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            style={{
              transform: `rotate(${isChannelsExpanded ? '90deg' : '0deg'})`,
              transition: 'transform 0.2s ease'
            }}
          >
            <path
              fill="currentColor"
              d="M8 5v14l11-7z"
            />
          </svg>
          <h2 style={{
            fontSize: '14px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.7)',
            margin: 0,
          }}>
            Channels
          </h2>
        </div>

        {/* Channel list */}
        {isChannelsExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {channels.map(channel => (
              <button
                key={channel.id}
                onClick={() => navigate(`/channels/${channel.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  background: channelId === channel.id ? 'rgba(255,255,255,0.1)' : 'none',
                  border: 'none',
                  borderRadius: '4px',
                  color: channelId === channel.id ? '#ffffff' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  fontSize: '16px',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.05)'
                  }
                }}
              >
                # {channel.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Direct Messages section */}
      <DirectMessages />
      
      {/* Online users section */}
      <div style={{ padding: '24px 16px 0' }}>
        <h2 style={{
          fontSize: '14px',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.7)',
          marginBottom: '12px'
        }}>
          Online
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {onlineUsers.map(user => (
            <div
              key={user.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
              }}
            >
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#2ecc71',
              }} />
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                {user.displayName || 'Guest User'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
