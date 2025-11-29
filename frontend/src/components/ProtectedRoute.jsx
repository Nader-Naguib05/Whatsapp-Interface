import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();

  // waiting for /auth/me
  if (!ready) return <div className="p-10 text-center">Loading...</div>;

  // if not logged in
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
