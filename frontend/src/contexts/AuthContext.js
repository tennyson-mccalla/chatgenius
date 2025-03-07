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
      console.log("Starting Google sign in...");
      const provider = new GoogleAuthProvider();
      
      // Add these troubleshooting lines
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      console.log("Created provider with custom parameters...");

      // Log full auth object (without sensitive data)
      console.log("Auth config:", {
        appName: auth.app.name,
        authDomain: auth.app.options.authDomain,
        apiKey: "REDACTED"
      });

      const result = await signInWithPopup(auth, provider);
      console.log("Auth result:", result.user);

      // After successful sign-in
      const userRef = doc(db, 'users', result.user.uid);
      console.log("Attempting to access:", userRef.path);

      await updateUserData(result.user, true);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Full error:", JSON.stringify(error));
      throw error;
    }
  };

  // Guest Sign In
  const signInAsGuest = async () => {
    try {
      console.log("Starting anonymous sign in...");
      
      // Log auth configuration
      console.log("Auth config for anonymous:", {
        appName: auth.app.name,
        authDomain: auth.app.options.authDomain,
        projectId: auth.app.options.projectId
      });
      
      const result = await signInAnonymously(auth);
      console.log("Anonymous sign in success:", result.user.uid);
      await updateUserData(result.user, true);
    } catch (error) {
      console.error("Error signing in as guest:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Full error object:", JSON.stringify(error, null, 2));
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
