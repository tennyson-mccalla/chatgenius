import React, { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import { WebSocketProvider } from "../contexts/WebSocketContext";
import { isDev } from "../config";

const wsUrl = isDev ? "ws://localhost:3000/ws" : "wss://api.chatgenius.org/ws";

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { token, user, authState } = useAuth();

  // Only redirect if we're not authenticated and not in the process of authenticating
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const wsConfig = useMemo(() => ({
    url: wsUrl,
    token,
    userId: user._id.toString(),
    username: user.username,
    reconnect: {
      maxAttempts: 3,
      initialDelay: 2000,
      maxDelay: 10000,
      timeoutMs: 5000
    }
  }), [token, user._id, user.username]);

  return (
    <WebSocketProvider config={wsConfig}>
      {children}
    </WebSocketProvider>
  );
};
