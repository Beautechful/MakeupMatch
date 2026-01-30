import { Navigate, Outlet } from 'react-router';

import LoadingScreen from '~/features/loading-screen/loading-screen';

import { useAuth } from '../firebase/auth-provider';

export default function ProtectedRoute() {
  const { user, loading: isUserLoading } = useAuth();

  if (isUserLoading) return <LoadingScreen />;

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
