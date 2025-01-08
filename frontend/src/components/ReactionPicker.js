import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';

const EMOJI_LIST = ['👍', '❤️', '😄', '🎉', '🤔', '👀', '🚀', '👏'];

function ReactionPicker({ messageId, onReactionSelect, onUpdate }) {
  const { token } = useAuth();

  const handleReactionClick = async (emoji) => {
    try {
      await fetch(`${API_BASE_URL}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      });

      onUpdate();
      onReactionSelect();
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  return (
    <div className="absolute bottom-full mb-2 bg-white border rounded shadow-lg p-2">
      <div className="grid grid-cols-4 gap-2">
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleReactionClick(emoji)}
            className="hover:bg-gray-100 p-1 rounded"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ReactionPicker;
