import React from 'react';
import { usePresence } from '../contexts/PresenceContext';
import { useAuth } from '../contexts/AuthContext';

function OnlineUsers() {
  const { onlineUsers } = usePresence();
  const { currentUser } = useAuth();

  // Filter to show only online users
  const activeUsers = onlineUsers.filter(user => user.online === true);

  if (!currentUser) return null;

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{
        padding: '0 16px',
        color: '#CFC3CF',
        marginBottom: '8px'
      }}>
        Online — {activeUsers.length}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {activeUsers.map(user => (
          <div
            key={user.id}
            style={{
              padding: '4px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#CFC3CF'
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#2BAC76'
            }} />
            {user.displayName || 'Guest User'}
          </div>
        ))}
      </div>
    </div>
  );
}

export default OnlineUsers;
