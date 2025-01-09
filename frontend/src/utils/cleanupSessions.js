import { collection, query, where, getDocs, updateDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Time in milliseconds after which a user is considered inactive (5 minutes)
const INACTIVE_THRESHOLD = 5 * 60 * 1000;

export async function cleanupStaleSessions() {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('online', '==', true)
  );

  const snapshot = await getDocs(q);
  const now = Date.now();

  snapshot.docs.forEach(async (doc) => {
    const lastSeen = doc.data().lastSeen?.toMillis();
    if (lastSeen && (now - lastSeen > INACTIVE_THRESHOLD)) {
      await updateDoc(doc.ref, {
        online: false,
        lastSeen: serverTimestamp()
      });
    }
  });
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
