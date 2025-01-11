import { useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export function usePresence(currentUser) {
  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const presenceRef = doc(db, 'presence', currentUser.uid);
    let cleanup = true;

    // Set initial online status
    const setOnlineStatus = async () => {
      if (!cleanup) return;

      const now = Timestamp.now();
      await setDoc(presenceRef, {
        online: true,
        lastSeen: now,
        lastUpdated: now,
        displayName: currentUser.displayName || 'Guest User'
      }, { merge: true });

      await setDoc(userRef, {
        displayName: currentUser.displayName || 'Guest User',
        photoURL: currentUser.photoURL,
        email: currentUser.email,
        isAnonymous: currentUser.isAnonymous,
        online: true,
        lastSeen: now,
        lastUpdated: now
      }, { merge: true });
    };

    setOnlineStatus();

    // Update presence periodically
    const interval = setInterval(async () => {
      if (!cleanup) return;
      try {
        const now = Timestamp.now();
        await setDoc(presenceRef, {
          lastUpdated: now,
          online: true  // Ensure we're still marked as online
        }, { merge: true });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    }, 30000); // Update every 30 seconds

    // Set up cleanup
    const handleUnload = async () => {
      cleanup = false;
      try {
        const now = Timestamp.now();
        await setDoc(presenceRef, {
          online: false,
          lastSeen: now,
          lastUpdated: now
        }, { merge: true });
      } catch (error) {
        if (!error.message.includes('cancel')) {
          console.error('Cleanup error:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      cleanup = false;
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload().catch(error => {
        if (!error.message.includes('cancel')) {
          console.error('Cleanup error:', error);
        }
      });
    };
  }, [currentUser]);
}
