import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { queryDocuments } from '../utils/aiService';
import ReactMarkdown from 'react-markdown';

function AIDocSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  
  useEffect(() => {
    // Load all processable files for the current user
    const loadFiles = async () => {
      try {
        const filesRef = collection(db, 'files');
        const filesQuery = query(
          filesRef, 
          where('uploadedBy', '==', currentUser.uid),
          where('canProcess', '==', true),
          orderBy('uploadedAt', 'desc')
        );
        
        const filesSnapshot = await getDocs(filesQuery);
        const filesData = [];
        
        filesSnapshot.forEach(doc => {
          filesData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setFiles(filesData);
      } catch (error) {
        console.error('Error loading files:', error);
        setError('Failed to load files. Please try again.');
      }
    };
    
    if (currentUser) {
      loadFiles();
    }
  }, [currentUser]);
  
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const results = await queryDocuments(searchQuery, selectedFiles);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching documents:', error);
      setError('Failed to search documents. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };
  
  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };
  
  return (
    <div className="p-6" style={{ color: isDark ? '#FFFFFF' : '#000000' }}>
      <h2 className="text-xl font-bold mb-4">AI Document Search</h2>
      
      <div className="mb-6">
        <form onSubmit={handleSearch}>
          <div className="flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="w-full p-2 border rounded-l"
              style={{ 
                backgroundColor: isDark ? '#333333' : '#FFFFFF',
                color: isDark ? '#FFFFFF' : '#000000',
                borderColor: isDark ? '#555555' : '#CCCCCC'
              }}
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2 rounded-r"
              style={{
                backgroundColor: '#522653',
                color: '#FFFFFF',
                opacity: (isSearching || !searchQuery.trim()) ? 0.7 : 1
              }}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      </div>
      
      {files.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Filter by Documents:</h3>
          <div className="flex flex-wrap gap-2">
            {files.map(file => (
              <div
                key={file.id}
                onClick={() => toggleFileSelection(file.id)}
                className="p-2 rounded cursor-pointer flex items-center"
                style={{
                  backgroundColor: selectedFiles.includes(file.id) 
                    ? (isDark ? '#522653' : '#E0D2E0') 
                    : (isDark ? '#333333' : '#EEEEEE'),
                }}
              >
                <span style={{ marginRight: '4px' }}>📄</span>
                <span style={{ 
                  maxWidth: '150px', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {file.name}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <button
              onClick={() => setSelectedFiles(files.map(file => file.id))}
              className="text-sm mr-3"
              style={{ color: isDark ? '#C4B4C5' : '#522653' }}
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-sm"
              style={{ color: isDark ? '#C4B4C5' : '#522653' }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-3 mb-4 rounded" style={{ backgroundColor: '#FF5555', color: '#FFFFFF' }}>
          {error}
        </div>
      )}
      
      {searchResults && (
        <div className="mt-4">
          <div className="p-4 rounded mb-4" style={{ 
            backgroundColor: isDark ? '#333333' : '#F5F5F5',
            border: `1px solid ${isDark ? '#444444' : '#DDDDDD'}`
          }}>
            <ReactMarkdown>
              {searchResults.answer}
            </ReactMarkdown>
          </div>
          
          {searchResults.sources && searchResults.sources.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Sources:</h3>
              <div className="flex flex-wrap gap-2">
                {searchResults.sources.map((source, index) => (
                  <div
                    key={index}
                    className="p-2 rounded"
                    style={{ backgroundColor: isDark ? '#333333' : '#EEEEEE' }}
                  >
                    <span style={{ marginRight: '4px' }}>📄</span>
                    <span>{source.fileName}</span>
                    <span className="text-xs ml-1" style={{ color: isDark ? '#AAAAAA' : '#666666' }}>
                      ({Math.round(source.similarity * 100)}% match)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {files.length === 0 && (
        <div className="p-4 rounded text-center" style={{ 
          backgroundColor: isDark ? '#333333' : '#F5F5F5',
          border: `1px solid ${isDark ? '#444444' : '#DDDDDD'}`
        }}>
          <p>You haven't uploaded any documents that can be searched yet.</p>
          <p className="mt-2">Upload text files to get started.</p>
        </div>
      )}
    </div>
  );
}

export default AIDocSearch;