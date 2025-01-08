import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Chat from './components/Chat';
import { useAuth } from './contexts/AuthContext';
import { PresenceProvider } from './contexts/PresenceContext';

function AuthenticatedApp() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Chat />} />
        <Route path="channel/:channelId" element={<Chat />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <PresenceProvider>
          <AuthenticatedApp />
        </PresenceProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
