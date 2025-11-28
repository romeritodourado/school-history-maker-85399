import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Marcar quando a verificação de autenticação foi concluída
  useEffect(() => {
    if (!authLoading) {
      setHasCheckedAuth(true);
    }
  }, [authLoading]);

  console.log(`ProtectedRoute (${location.pathname}): authLoading=${authLoading}, user=${!!user}, role=${role}, hasCheckedAuth=${hasCheckedAuth}`);

  // 1. Enquanto estiver carregando a autenticação, mostra um loader
  if (authLoading || !hasCheckedAuth) {
    console.log(`ProtectedRoute (${location.pathname}): Waiting for auth to load.`);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando...</span>
      </div>
    );
  }

  // 2. Se não estiver autenticado, redireciona para a página de login
  if (!user) {
    console.log(`ProtectedRoute (${location.pathname}): User not authenticated, redirecting to login.`);
    // Evita redirecionar da página de setup inicial do super admin
    if (location.pathname !== '/initial-superadmin-setup') {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
  }

  // 3. Se o usuário está autenticado, mas o perfil/role não foi carregado
  // Isso pode indicar um usuário sem perfil no banco de dados
  if (user && role === null) {
    console.log(`ProtectedRoute (${location.pathname}): User authenticated but no profile found.`);
    // Verifica se a rota atual é a de configuração inicial do Super Admin
    if (location.pathname === '/initial-superadmin-setup') {
      console.log(`ProtectedRoute (${location.pathname}): Allowing access to initial super admin setup.`);
      return <>{children}</>;
    }
    // Para outras rotas, exibe uma mensagem de perfil incompleto
    console.log(`ProtectedRoute (${location.pathname}): Showing incomplete profile message.`);
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

  // 4. Verifica se o usuário tem as roles necessárias para a rota
  if (requiredRoles && requiredRoles.length > 0 && (!role || !requiredRoles.includes(role as AppRole))) {
    console.log(`ProtectedRoute (${location.pathname}): User does not have required role. Required: ${requiredRoles.join(', ')}, User role: ${role}`);
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

  // 5. Se todas as verificações passarem, renderiza o conteúdo da rota
  console.log(`ProtectedRoute (${location.pathname}): All checks passed, rendering children.`);
  return <>{children}</>;
}