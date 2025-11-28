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
  const { user, role, loading: authLoading } = useAuth();
  const location = useLocation();

  console.log(`ProtectedRoute (${location.pathname}): authLoading=${authLoading}, user=${!!user}, role=${role}`);

  // Show loading spinner while auth is initializing
  if (authLoading) {
    console.log(`ProtectedRoute (${location.pathname}): Showing loading spinner`);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando...</span>
      </div>
    );
  }

  // If no user, redirect to login (except for initial setup)
  if (!user) {
    console.log(`ProtectedRoute (${location.pathname}): No user, redirecting to login`);
    if (location.pathname !== '/initial-superadmin-setup') {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
  }

  // If user exists but no role, show profile incomplete message (except for initial setup)
  if (user && role === null) {
    console.log(`ProtectedRoute (${location.pathname}): User exists but no role`);
    if (location.pathname === '/initial-superadmin-setup') {
      return <>{children}</>;
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Perfil de Usuário Incompleto</h1>
          <p className="text-muted-foreground">
            Seu perfil de usuário não foi encontrado ou está incompleto. Por favor, entre em contato com o administrador.
          </p>
        </div>
      </div>
    );
  }

  // Check if user has required roles
  if (requiredRoles && requiredRoles.length > 0 && (!role || !requiredRoles.includes(role as AppRole))) {
    console.log(`ProtectedRoute (${location.pathname}): User does not have required role`);
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

  // All checks passed, render children
  console.log(`ProtectedRoute (${location.pathname}): All checks passed, rendering children`);
  return <>{children}</>;
}