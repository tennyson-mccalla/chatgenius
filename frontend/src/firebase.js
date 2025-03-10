import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED, collection } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Using environment variables for Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Log config and current location for debugging
console.log('DEBUG - Using Firebase Config:', firebaseConfig);
console.log('DEBUG - Current Location:', window.location.href);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Configure Firestore
const initializeFirestore = async () => {
  try {
    // Enable offline persistence
    await enableIndexedDbPersistence(db, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED
    });
  } catch (err) {
    if (err.code === 'failed-precondition') {
      console.log('Persistence failed to enable: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.log('Persistence not supported by browser');
    }
  }
};

// Initialize Firestore settings
if (window.location.hostname === 'localhost') {
  // connectFirestoreEmulator(db, 'localhost', 8080);
}

initializeFirestore().catch(console.error);

// Configure Auth settings
auth.useDeviceLanguage();

// New collections in Firestore
const directMessages = collection(db, 'directMessages');
const threads = collection(db, 'threads');
const reactions = collection(db, 'reactions');

// Collections
export const channelsRef = collection(db, 'channels');
export const directMessagesRef = collection(db, 'directMessages');
export const threadsRef = collection(db, 'threads');
export const reactionsRef = collection(db, 'reactions');

export { app, auth, db, storage };
