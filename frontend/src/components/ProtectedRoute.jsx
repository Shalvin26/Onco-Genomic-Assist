import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { doctor, loading } = useAuth();

  if (loading) return null;
  if (!doctor) return <Navigate to="/login" replace />;

  return children;
}