import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';

function Login() {
  const { isDark } = useTheme();

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleGuestSignIn = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Error signing in as guest:', error);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: isDark
        ? 'linear-gradient(135deg, #2b1331 0%, #1a1a1a 100%)'
        : 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)',
      color: '#ffffff',
    }}>
      <h1 style={{
        marginBottom: '2rem',
        fontSize: '2.5rem',
        fontWeight: 'bold',
        textShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        Chat Genius
      </h1>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: '100%',
        maxWidth: '300px',
      }}>
        <button
          onClick={handleGoogleSignIn}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#ffffff',
            color: '#333333',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12.545,12.151L12.545,12.151c0,1.054,0.855,1.909,1.909,1.909h3.536c-0.367,1.99-1.781,3.649-3.535,4.544 c-2.726,1.396-6.063,0.321-7.459-2.405c-1.396-2.726-0.321-6.063,2.405-7.459c1.134-0.581,2.401-0.767,3.627-0.567l-0.297,1.98 c-0.751-0.113-1.532-0.037-2.266,0.282c-1.775,0.909-2.478,3.067-1.569,4.842c0.909,1.775,3.067,2.478,4.842,1.569 c1.048-0.537,1.771-1.502,1.971-2.626h-3.926C12.884,13.22,12.545,12.151,12.545,12.151z"/>
          </svg>
          Sign in with Google
        </button>

        <button
          onClick={handleGuestSignIn}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '2px solid rgba(255,255,255,0.2)',
            backgroundColor: 'transparent',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'transform 0.2s, background-color 0.2s',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.1)',
              transform: 'translateY(-1px)',
            }
          }}
        >
          Continue as Guest
        </button>
      </div>
    </div>
  );
}

export default Login;
