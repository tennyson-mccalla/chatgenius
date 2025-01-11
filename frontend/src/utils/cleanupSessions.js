import { collection, query, where, getDocs, updateDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Time in milliseconds after which a user is considered inactive (5 minutes)
const INACTIVE_THRESHOLD = 5 * 60 * 1000;

export async function cleanupStaleSessions() {
  try {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    // Query for stale presence records
    const presenceRef = collection(db, 'presence');
    const staleQuery = query(
      presenceRef,
      where('online', '==', true),
      where('lastUpdated', '<', fiveMinutesAgo)
    );

    const snapshot = await getDocs(staleQuery);

    // Update stale records
    const updates = snapshot.docs.map(async (doc) => {
      const presenceRef = doc.ref;
      const userRef = doc(db, 'users', doc.id);

      const offlineData = {
        online: false,
        lastSeen: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };

      return Promise.all([
        setDoc(presenceRef, offlineData, { merge: true }),
        setDoc(userRef, offlineData, { merge: true })
      ]);
    });

    await Promise.all(updates);
  } catch (error) {
    console.error('Error cleaning up stale sessions:', error);
  }
}

export const cleanupUserSession = async (userId) => {
  try {
    const userPresenceRef = doc(db, 'presence', userId);
    const presenceData = {
      online: false,
      lastSeen: new Date().toISOString()
    };

    try {
      await updateDoc(userPresenceRef, presenceData);
    } catch (error) {
      if (error.code === 'not-found') {
        await setDoc(userPresenceRef, presenceData);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.log('Error updating presence:', error);
  }
};

export const handleSignOut = async (navigate) => {
  try {
    const userId = auth.currentUser?.uid;

    // Clean up user session
    if (userId) {
      await cleanupUserSession(userId);
    }

    // Sign out first
    await auth.signOut();

    // Navigate immediately
    if (navigate) {
      navigate('/login', { replace: true });
    } else {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Error during sign out:', error);
    // Still try to navigate even if cleanup fails
    if (navigate) {
      navigate('/login', { replace: true });
    } else {
      window.location.href = '/login';
    }
  }
};
