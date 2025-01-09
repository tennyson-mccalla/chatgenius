import { useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export function usePresence(currentUser) {
  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const presenceRef = doc(db, 'presence', currentUser.uid);
    let cleanup = true;

    // Set initial online status
    const setOnlineStatus = async () => {
      if (!cleanup) return; // Don't update if we're cleaning up

      await setDoc(presenceRef, {
        online: true,
        lastSeen: new Date().toISOString(),
        displayName: currentUser.displayName || 'Guest User'
      }, { merge: true });

      await setDoc(userRef, {
        displayName: currentUser.displayName || 'Guest User',
        photoURL: currentUser.photoURL,
        email: currentUser.email,
        isAnonymous: currentUser.isAnonymous
      }, { merge: true });
    };

    setOnlineStatus();

    // Set up cleanup
    const handleUnload = async () => {
      cleanup = false; // Prevent further updates
      try {
        await setDoc(presenceRef, {
          online: false,
          lastSeen: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        // Only log if it's not a cancelled request
        if (!error.message.includes('cancel')) {
          console.log('Cleanup error (expected during logout):', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      cleanup = false; // Prevent updates during cleanup
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload().catch(error => {
        // Only log if it's not a cancelled request
        if (!error.message.includes('cancel')) {
          console.log('Cleanup error:', error);
        }
      });
    };
  }, [currentUser]);
}
