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

const PresenceContext = createContext();

export function usePresence() {
  return useContext(PresenceContext);
}

export function PresenceProvider({ children }) {
  const { currentUser } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Update user's online status
  useEffect(() => {
    if (!currentUser) {
      setOnlineUsers([]); // Clear online users when logged out
      return;
    }

    const updatePresence = async () => {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        online: true,
        lastSeen: serverTimestamp()
      }, { merge: true });
    };

    // Update presence when component mounts
    updatePresence();

    // Set up presence monitoring
    const beforeUnloadHandler = () => {
      const userRef = doc(db, 'users', currentUser.uid);
      setDoc(userRef, {
        online: false,
        lastSeen: serverTimestamp()
      }, { merge: true });
    };

    // Listen for online users only when logged in
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOnlineUsers(users);
    });

    // Add beforeunload listener
    window.addEventListener('beforeunload', beforeUnloadHandler);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      if (currentUser) {
        unsubscribe();
        beforeUnloadHandler();
      }
    };
  }, [currentUser]);

  // Only show the online users list when logged in
  const value = {
    onlineUsers: currentUser ? onlineUsers : []
  };

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}
