import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD0JHrXV3arFeUHsHeW12RiKx-qvWGiEMU",
  authDomain: "chatgenius-75366.firebaseapp.com",
  projectId: "chatgenius-75366",
  storageBucket: "chatgenius-75366.firebasestorage.app",
  messagingSenderId: "814035880589",
  appId: "1:814035880589:web:e7656eda3e86ee0e11b0c4",
  measurementId: "G-EYP4F32756"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
  auth,
  db,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut
};
