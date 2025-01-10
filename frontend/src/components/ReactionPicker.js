import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

function ReactionPicker({ message, onReactionSelect }) {
  const { isDark } = useTheme();
  const commonEmojis = ['👍', '❤️', '😄', '🎉', '🤔', '👀'];

  return (
    <div style={{
      position: 'absolute',
      backgroundColor: isDark ? '#292a2d' : '#ffffff',
      border: `1px solid ${isDark ? '#3c4043' : '#e2e2e2'}`,
      borderRadius: '6px',
      padding: '8px',
      display: 'flex',
      gap: '8px'
    }}>
      {commonEmojis.map(emoji => (
        <button
          key={emoji}
          onClick={() => onReactionSelect(emoji)}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '20px'
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export default ReactionPicker;
