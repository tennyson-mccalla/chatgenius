import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut
} from 'firebase/auth';
import {
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Store user data in Firestore
  const updateUserData = async (user, isOnline = true) => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || 'Guest User',
      photoURL: user.photoURL || null,
      lastSeen: serverTimestamp(),
      online: isOnline,
      isGuest: user.isAnonymous
    }, { merge: true }); // merge: true updates existing data without overwriting
  };

  // Google Sign In
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await updateUserData(result.user, true);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  // Guest Sign In
  const signInAsGuest = async () => {
    try {
      const result = await signInAnonymously(auth);
      await updateUserData(result.user, true);
    } catch (error) {
      console.error("Error signing in as guest:", error);
      throw error;
    }
  };

  // Sign Out
  const logout = async () => {
    try {
      // Update lastSeen before logging out
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, {
          online: false,
          lastSeen: serverTimestamp()
        }, { merge: true });
      }
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      if (user) {
        await updateUserData(user, true);
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signInWithGoogle,
    signInAsGuest,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
