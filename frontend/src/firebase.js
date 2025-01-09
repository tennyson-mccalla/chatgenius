import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';

// console.log('Firebase Config:', {
//   apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
//   authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID
// });

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.REACT_APP_FIREBASE_PROJECT_ID}.appspot.com`
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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

export { app, auth, db };
