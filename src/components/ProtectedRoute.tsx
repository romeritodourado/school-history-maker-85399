import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type AppRole = 'super_admin' | 'municipal_admin' | 'school_admin' | 'secretary' | 'assistente_administrativo';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Allow access to /municipal-dashboard/:id if user is super_admin and not logged in yet,
    // but the AuthContext is still loading. This is handled by AuthRedirectHandler.
    // For now, if no user, redirect to login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If requiredRoles are specified, check if the user's role is included.
  // For super_admin accessing /municipal-dashboard/:id, the requiredRoles will be ['super_admin'].
  // For other roles, the check is straightforward.
  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(role as AppRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}