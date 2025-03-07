import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Navigate, useParams, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Chat from './Chat';
import AIDocSearch from './AIDocSearch';
import ThemeToggle from './ThemeToggle';
import { handleSignOut } from '../utils/cleanupSessions';
import { usePresence } from '../hooks/usePresence';

function Layout() {
  const { isDark } = useTheme();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  usePresence(currentUser);

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100%',
    }}>
      {/* Unified header */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '48px',
        backgroundColor: '#2F1F3F',
        display: 'flex',
        alignItems: 'center',
        zIndex: 100,
      }}>
        {/* Left section matching workspace column width - removed border */}
        <div style={{
          width: '64px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ThemeToggle />
        </div>

        {/* Title section */}
        <div style={{
          padding: '0 16px',
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#ffffff'
          }}>
            Chat Genius
          </h1>
        </div>
      </div>

      {/* Main content with top padding for header */}
      <div style={{
        display: 'flex',
        width: '100%',
        marginTop: '48px'
      }}>
        {/* Workspace Column */}
        <div style={{
          width: '64px',
          minWidth: '64px',
          height: 'calc(100vh - 48px)',
          backgroundColor: '#2F1F3F',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          flexShrink: 0
        }}>
          {currentUser && (
            <button
              onClick={() => handleSignOut(navigate)}
              style={{
                marginTop: 'auto',
                background: 'none',
                border: 'none',
                padding: '8px',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.7)',
                '&:hover': {
                  color: '#ffffff'
                }
              }}
              aria-label="Sign out"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
            </button>
          )}
        </div>

        {/* Channels Column */}
        <div style={{
          width: '240px',
          minWidth: '240px',
          height: 'calc(100vh - 48px)',
          backgroundColor: '#3F2F4F',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          minWidth: 0,
          backgroundColor: isDark ? '#1a1d21' : '#ffffff'
        }}>
          {location.pathname.startsWith('/ai/docsearch') ? (
            <AIDocSearch />
          ) : (
            <Chat userId={params.userId} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Layout;
