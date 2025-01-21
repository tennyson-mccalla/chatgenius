import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../store/authStore";

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { token, user } = useAuth();

  // Only redirect if we're not authenticated
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
