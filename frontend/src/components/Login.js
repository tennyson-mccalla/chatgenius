import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const { signInWithGoogle, signInAsGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInAsGuest();
      // Success is handled by AuthContext redirecting to main app
    } catch (err) {
      setError(err.message);
      console.error('Guest login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
      // Success is handled by AuthContext redirecting to main app
    } catch (err) {
      // Special handling for popup closed by user
      const errorMessage = err.code === 'auth/popup-closed-by-user'
        ? 'Sign-in cancelled. Please try again.'
        : err.message;
      setError(errorMessage);
      console.error('Google login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#3F0E40'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <h1 style={{
          marginBottom: '32px',
          color: '#1d1c1d',
          fontSize: '28px'
        }}>
          Welcome to ChatGenius
        </h1>

        {error && (
          <div style={{
            backgroundColor: '#fce8e8',
            color: '#c53030',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              padding: '12px 24px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              color: '#1d1c1d',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (
              <span style={{
                width: '16px',
                height: '16px',
                border: '2px solid #611f69',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 1s linear infinite'
              }} />
            ) : (
              <>
                <img
                  src="https://www.google.com/favicon.ico"
                  alt="Google"
                  style={{ width: '18px', height: '18px' }}
                />
                Sign in with Google
              </>
            )}
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '8px 0'
          }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
            <span style={{ margin: '0 16px', color: '#616061' }}>or</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }} />
          </div>

          <button
            onClick={handleGuestLogin}
            disabled={loading}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#611f69',
              color: 'white',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <span style={{
                width: '16px',
                height: '16px',
                border: '2px solid #ffffff',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 1s linear infinite'
              }} />
            ) : 'Continue as Guest'}
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

export default Login;
