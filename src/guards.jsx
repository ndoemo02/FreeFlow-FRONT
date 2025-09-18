// src/guards.jsx
import { Navigate } from "react-router-dom";
import { useUser } from "./UserContext";

export function RequireBusiness({ children }) {
  const { userType, loading } = useUser();
  if (loading) return null;
  return userType === "business" ? children : <Navigate to="/panel-klienta" replace />;
}

export function RequireCustomer({ children }) {
  const { userType, loading } = useUser();
  if (loading) return null;
  return userType !== "business" ? children : <Navigate to="/panel-biznesu" replace />;
}
