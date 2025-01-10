function FileUpload({ onFileSelect }) {
  const handleUpload = async (file) => {
    // Upload to Firebase Storage
    const storageRef = ref(storage, `files/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  };

  return (
    <button style={{
      border: 'none',
      background: 'none',
      color: '#CFC3CF',
      cursor: 'pointer'
    }}>
      <span role="img" aria-label="attach">📎</span>
    </button>
  );
} 
