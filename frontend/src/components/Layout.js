import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Channels from './Channels';
import OnlineUsers from './OnlineUsers';

function Layout() {
  const { logout } = useAuth();

  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      {/* Left icon bar */}
      <div style={{
        width: '64px',
        backgroundColor: '#400C41',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          backgroundColor: '#611f69',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '20px'
        }}>
          C
        </div>
      </div>

      {/* Channel sidebar */}
      <div style={{
        width: '260px',
        backgroundColor: '#57275A',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Workspace header */}
        <div style={{
          padding: '16px',
          color: 'white',
          borderBottom: '1px solid #522653'
        }}>
          {/* Search bar */}
          <div style={{
            backgroundColor: '#724475',
            borderRadius: '4px',
            padding: '8px 12px',
            marginBottom: '16px'
          }}>
            <input
              type="text"
              placeholder="Search"
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'white',
                outline: 'none',
                '::placeholder': { color: '#CFC3CF' }
              }}
            />
          </div>

          <h1 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            ChatGenius
          </h1>
        </div>

        {/* Channels list */}
        <Channels />

        {/* Add OnlineUsers before logout button */}
        <OnlineUsers />

        {/* Logout button */}
        <button
          onClick={logout}
          style={{
            margin: '16px',
            padding: '8px 16px',
            backgroundColor: '#611f69',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: 'auto'
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, backgroundColor: '#fff' }}>
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
