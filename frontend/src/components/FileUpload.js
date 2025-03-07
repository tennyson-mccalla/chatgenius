import React, { useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { s3, bucketName } from '../aws-config';
import { processDocument } from '../utils/aiService';

function FileUpload({ channelId, dmId, onFileSelect, onUploadComplete }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [files, setFiles] = useState([]);
  const [processingFiles, setProcessingFiles] = useState({});
  const fileInputRef = useRef(null);
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  
  // Supported file types
  const fileTypes = {
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/gif': 'image',
    'image/webp': 'image',
    'application/pdf': 'document',
    'text/plain': 'document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
    'video/mp4': 'video',
    'video/quicktime': 'video',
    'audio/mpeg': 'audio',
    'audio/mp3': 'audio',
    'audio/wav': 'audio'
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setShowFileDialog(true);
  };

  const extractTextFromFile = async (file) => {
    // Simple extraction for text files
    if (file.type === 'text/plain') {
      return await file.text();
    }
    
    // For other file types, return empty string for now
    // In a real app, you would use APIs or libraries to extract text from PDFs, DOCs, etc.
    return "";
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    try {
      setIsUploading(true);
      
      const uploadedFiles = await Promise.all(
        files.map(async (file, index) => {
          // Update progress as we process each file
          const progressInterval = setInterval(() => {
            setUploadProgress((prev) => {
              const newProgress = prev + (1 / files.length) * 5;
              return Math.min(newProgress, 95 * (index + 1) / files.length);
            });
          }, 200);
          
          // Create a unique filename
          const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const key = `uploads/${currentUser.uid}/${fileName}`;
          
          // Setup the upload parameters
          const params = {
            Bucket: bucketName,
            Key: key, 
            Body: file,
            ContentType: file.type
            // Removed ACL parameter as bucket doesn't support ACLs
          };
          
          try {
            // Upload to S3
            const uploadResult = await s3.upload(params).promise();
            console.log('S3 upload result:', uploadResult);
            
            // Get the public URL
            const url = uploadResult.Location;
            
            // Extract text for RAG processing if it's a supported document type
            let fileText = "";
            let canProcess = false;
            
            if (file.type === 'text/plain' || file.type.includes('document')) {
              fileText = await extractTextFromFile(file);
              canProcess = fileText.length > 0;
            }
            
            // Add file metadata to Firestore
            const fileDoc = await addDoc(collection(db, "files"), {
              name: file.name,
              type: file.type,
              size: file.size,
              url: url,
              path: key,
              uploadedBy: currentUser.uid,
              uploadedAt: serverTimestamp(),
              channelId: channelId || null, 
              dmId: dmId || null,
              category: fileTypes[file.type] || 'other',
              canProcess: canProcess,
              status: canProcess ? 'pending' : 'not_applicable'
            });
            
            clearInterval(progressInterval);
            
            // Process document for RAG if text was extracted
            if (canProcess) {
              setProcessingFiles(prev => ({
                ...prev,
                [fileDoc.id]: true
              }));
              
              try {
                await processDocument(fileText, file.name, fileDoc.id);
              } catch (err) {
                console.error('Error processing document for RAG:', err);
              } finally {
                setProcessingFiles(prev => {
                  const updated = {...prev};
                  delete updated[fileDoc.id];
                  return updated;
                });
              }
            }
            
            return {
              id: fileDoc.id,
              name: file.name,
              url,
              type: file.type,
              size: file.size,
              category: fileTypes[file.type] || 'other',
              canProcess
            };
          } catch (err) {
            clearInterval(progressInterval);
            console.error('Error uploading to S3:', err);
            throw err;
          }
        })
      );
      
      // Call onUploadComplete with the uploaded files
      if (onUploadComplete) {
        onUploadComplete(uploadedFiles);
      }
      
      // Call onFileSelect with the first file (for backward compatibility)
      if (onFileSelect) {
        onFileSelect(uploadedFiles[0].url);
      }
      
      setShowFileDialog(false);
      setFiles([]);
      
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  const getFileIcon = (fileType) => {
    const category = fileTypes[fileType] || 'other';
    
    switch (category) {
      case 'image':
        return '🖼️';
      case 'document':
        return '📄';
      case 'video':
        return '🎬';
      case 'audio':
        return '🎵';
      default:
        return '📁';
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        multiple
      />
      <button 
        onClick={handleFileClick}
        disabled={isUploading}
        style={{
          border: 'none',
          background: 'none',
          color: '#CFC3CF',
          cursor: 'pointer',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span role="img" aria-label="attach">📎</span>
      </button>

      {/* File Dialog */}
      {showFileDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: isDark ? '#2D2D2D' : '#FFFFFF',
            borderRadius: '8px',
            padding: '20px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ 
              color: isDark ? '#FFFFFF' : '#000000',
              marginBottom: '16px'
            }}>
              Upload Files
            </h2>
            
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              marginBottom: '16px'
            }}>
              {files.map((file, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  borderRadius: '4px',
                  backgroundColor: isDark ? '#3D3D3D' : '#F5F5F5',
                  marginBottom: '8px'
                }}>
                  <div style={{ marginRight: '12px', fontSize: '24px' }}>
                    {getFileIcon(file.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      color: isDark ? '#FFFFFF' : '#000000',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                      wordBreak: 'break-all'
                    }}>
                      {file.name}
                    </div>
                    <div style={{ 
                      color: isDark ? '#BBBBBB' : '#777777',
                      fontSize: '12px'
                    }}>
                      {formatFileSize(file.size)}
                      {file.type === 'text/plain' && " • Will be processed for AI search"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newFiles = [...files];
                      newFiles.splice(index, 1);
                      setFiles(newFiles);
                      if (newFiles.length === 0) {
                        setShowFileDialog(false);
                      }
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: isDark ? '#BBBBBB' : '#777777',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            
            {isUploading && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: isDark ? '#3D3D3D' : '#EEEEEE',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    backgroundColor: '#522653',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <div style={{
                  textAlign: 'center',
                  marginTop: '4px',
                  color: isDark ? '#BBBBBB' : '#777777',
                  fontSize: '12px'
                }}>
                  Uploading... {uploadProgress}%
                </div>
              </div>
            )}
            
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <button
                onClick={() => {
                  setShowFileDialog(false);
                  setFiles([]);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: isDark ? '#555555' : '#EEEEEE',
                  color: isDark ? '#FFFFFF' : '#000000',
                  cursor: 'pointer'
                }}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                style={{
                  padding: '8px 16px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#522653',
                  color: '#FFFFFF',
                  cursor: 'pointer'
                }}
                disabled={isUploading || files.length === 0}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FileUpload;