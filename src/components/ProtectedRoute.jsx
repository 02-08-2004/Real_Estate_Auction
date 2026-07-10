// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, userRole } = useAuth();
  
  if (!currentUser) return <Navigate to="/login" replace />;
  
  // Extra layer of security: block unverified users
  if (!currentUser.emailVerified) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to={userRole === "admin" ? "/admin-dashboard" : "/user-dashboard"} replace />;
  }
  return children;
}
