import { collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

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
