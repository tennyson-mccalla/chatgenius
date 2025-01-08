import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Channels() {
  const [channels, setChannels] = useState([]);
  const { channelId } = useParams();
  const [isExpanded, setIsExpanded] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setChannels([]);
      return;
    }

    const q = query(collection(db, 'channels'), orderBy('name'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const channelData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChannels(channelData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <div style={{ padding: '16px 0' }}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          width: '100%',
          background: 'none',
          border: 'none',
          color: '#CFC3CF',
          cursor: 'pointer',
          marginBottom: '4px'
        }}
      >
        <span style={{
          transform: `rotate(${isExpanded ? '0deg' : '-90deg'})`,
          display: 'inline-block',
          marginRight: '4px'
        }}>
          ▼
        </span>
        Channels
      </button>

      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {channels.map(channel => (
            <Link
              key={channel.id}
              to={`/channel/${channel.id}`}
              style={{
                padding: '4px 16px',
                color: channelId === channel.id ? '#FFFFFF' : '#CFC3CF',
                textDecoration: 'none',
                backgroundColor: channelId === channel.id ? '#4A154B' : 'transparent',
                ':hover': {
                  backgroundColor: channelId === channel.id ? '#4A154B' : '#350D36'
                }
              }}
            >
              # {channel.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Channels;
