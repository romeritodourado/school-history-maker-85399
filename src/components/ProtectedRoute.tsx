import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type AppRole = 
  | 'super_admin'
  | 'municipal_secretary'
  | 'network_manager'
  | 'school_admin'
  | 'secretary'
  | 'teacher';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log(
      `ProtectedRoute (${location.pathname}): loading=${loading}, user=${!!user}, role=${role}`
    );
  }, [loading, user, role, location.pathname]);

  // 🔥 Correção principal: esperar a role carregar
  if (loading || (user && role === null)) {
    console.log(
      `ProtectedRoute (${location.pathname}): Waiting for role to load (loading=${loading}, role=${role}).`
    );
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    console.log(
      `ProtectedRoute (${location.pathname}): User not found, redirecting to /login.`
    );
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (
    requiredRoles &&
    requiredRoles.length > 0 &&
    !requiredRoles.includes(role as AppRole)
  ) {
    console.log(
      `ProtectedRoute (${location.pathname}): Access denied for role ${role}.`
    );
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

  console.log(`ProtectedRoute (${location.pathname}): Access granted.`);
  return <>{children}</>;
}