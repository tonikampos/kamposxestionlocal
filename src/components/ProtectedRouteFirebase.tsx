import { Navigate } from 'react-router-dom';
import { useRealtimeAuth } from '../firebase/RealtimeAuthContext';
import type { ReactNode } from 'react';

interface ProtectedRouteFirebaseProps {
  children: ReactNode;
}

const ProtectedRouteFirebase = ({ children }: ProtectedRouteFirebaseProps) => {
  const { currentUser, loading } = useRealtimeAuth();

  // Mostrar indicador de carga mientras verificamos la autenticación
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirigir al login si no está autenticado
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Si está autenticado, mostrar el contenido protegido
  return <>{children}</>;
};

export default ProtectedRouteFirebase;
