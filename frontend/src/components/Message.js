import React from 'react';
import ReactMarkdown from 'react-markdown';

function Message({ message }) {
  return (
    <div style={{
      padding: '8px 20px',
      display: 'flex',
      gap: '12px',
      ':hover': {
        backgroundColor: '#f8f8f8'
      }
    }}>
      {/* User avatar */}
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '4px',
        backgroundColor: '#7C3085',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '14px'
      }}>
        {message.user.name[0]}
      </div>

      {/* Message content */}
      <div>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold', marginRight: '8px' }}>
            {message.user.name}
          </span>
          <span style={{ color: '#616061', fontSize: '12px' }}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div>
          {message.formatted ? (
            <ReactMarkdown>{message.text}</ReactMarkdown>
          ) : (
            message.text
          )}
        </div>
      </div>
    </div>
  );
}

export default Message;
