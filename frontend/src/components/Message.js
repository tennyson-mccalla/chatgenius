import { useTheme } from '../contexts/ThemeContext';
import ReactMarkdown from 'react-markdown';

function Message({ message }) {
  const { isDark } = useTheme();

  return (
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
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div style={{
          color: isDark ? '#e8eaed' : '#202124',
          lineHeight: '1.4'
        }}>
          <ReactMarkdown>{message.text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export default Message;
