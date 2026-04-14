import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

const PrivateRouter = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default PrivateRouter
