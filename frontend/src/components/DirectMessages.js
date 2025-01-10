import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function DirectMessages() {
  const [dms, setDms] = useState([]);
  const { currentUser } = useAuth();

  // Similar structure to ChannelList but for DMs
  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{
        padding: '0 16px',
        color: '#CFC3CF',
        marginBottom: '8px',
        fontSize: '13px',
        fontWeight: '500',
        letterSpacing: '0.8px'
      }}>
        DIRECT MESSAGES
      </div>
      {/* DM list */}
    </div>
  );
}

export default DirectMessages;
