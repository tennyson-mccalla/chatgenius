import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';

function MessageInput({ channelId, onMessageSent }) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const { token } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content && !file) return;

    try {
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channelId,
          content
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      setContent('');
      setFile(null);
      onMessageSent();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="px-6 pb-6">
      <form onSubmit={handleSubmit}>
        <div className="border border-[#424242] rounded">
          {/* Formatting toolbar */}
          <div className="px-2 py-1 border-b border-[#424242] flex items-center space-x-2">
            <button type="button" className="p-1 text-[#C4B4C5] hover:text-white">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.293 3.293a1 1 0 011.414 0l2 2a1 1 0 010 1.414l-9 9a1 1 0 01-.39.242l-3 1a1 1 0 01-1.266-1.265l1-3a1 1 0 01.242-.391l9-9zM14 4l2 2-9 9-3 1 1-3 9-9z"/>
              </svg>
            </button>
            <input
              type="file"
              id="file-input"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0])}
            />
            <label
              htmlFor="file-input"
              className="p-1 text-[#C4B4C5] hover:text-white cursor-pointer"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd"/>
              </svg>
            </label>
          </div>

          {/* Message input */}
          <div className="px-3 py-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Message #channel"
              className="w-full bg-transparent text-white placeholder-[#8B8B8B] focus:outline-none"
            />
          </div>
        </div>
      </form>
    </div>
  );
}

export default MessageInput;
