import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

const PrivateRouter = ({ children, allowedRoles = [] }) => {
  const { user, role } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default PrivateRouter
