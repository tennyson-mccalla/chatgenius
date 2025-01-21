import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMessages, SearchResult } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

interface SearchMessagesProps {
  onClose?: () => void;
}

export const SearchMessages: React.FC<SearchMessagesProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await searchMessages(query);
      setResults(response.results);
    } catch (err) {
      setError('Failed to search messages');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const navigateToMessage = (result: SearchResult) => {
    navigate(`/channel/${result.metadata.channelId}?messageId=${result.metadata.messageId}`);
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col w-full max-w-lg">
      <div className="flex items-center gap-2 p-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search messages..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="p-2 mt-2 text-sm text-red-600 bg-red-100 rounded">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 overflow-y-auto max-h-96">
          {results.map((result) => (
            <div
              key={result.metadata.messageId}
              onClick={() => navigateToMessage(result)}
              className="p-4 mb-2 bg-white rounded-lg shadow cursor-pointer hover:bg-gray-50"
            >
              <div className="text-sm text-gray-500">
                Score: {(result.score * 100).toFixed(1)}% match
              </div>
              <div className="mt-1 font-medium">
                {result.metadata.text}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {formatDistanceToNow(new Date(result.metadata.createdAt))} ago
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
