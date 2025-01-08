import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  onSnapshot
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { cleanupStaleSessions } from '../utils/cleanupSessions';

const PresenceContext = createContext();

export function usePresence() {
  return useContext(PresenceContext);
}

export function PresenceProvider({ children }) {
  const { currentUser } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      setOnlineUsers([]);
      return;
    }

    // Clean up stale sessions when a new user logs in
    cleanupStaleSessions();

    // Update user's online status
    const userRef = doc(db, 'users', currentUser.uid);
    setDoc(userRef, {
      online: true,
      lastSeen: serverTimestamp()
    }, { merge: true });

    // Subscribe to online users
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOnlineUsers(users);
    });

    // Update lastSeen periodically
    const intervalId = setInterval(() => {
      setDoc(userRef, {
        lastSeen: serverTimestamp()
      }, { merge: true });
    }, 30000);

    // Handle page unload
    const beforeUnloadHandler = () => {
      setDoc(userRef, {
        online: false,
        lastSeen: serverTimestamp()
      }, { merge: true });
    };

    // Add beforeunload listener
    window.addEventListener('beforeunload', beforeUnloadHandler);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      if (currentUser) {
        unsubscribe();
        clearInterval(intervalId);
        beforeUnloadHandler();
      }
    };
  }, [currentUser]);

  const value = {
    onlineUsers: currentUser ? onlineUsers : []
  };

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}
