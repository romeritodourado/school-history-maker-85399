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

  // 1. Espera o estado de autenticação carregar completamente
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2. Se não estiver autenticado, redireciona para a página de login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Se o usuário está autenticado, mas o perfil/role não foi carregado (role é null)
  // Isso pode indicar um usuário sem perfil no banco de dados ou um erro na busca do perfil.
  if (user && role === null) {
    // Verifica se a rota atual é a de configuração inicial do Super Admin.
    // Se for, permite o acesso para que o perfil possa ser criado.
    if (location.pathname === '/initial-superadmin-setup') {
      return <>{children}</>;
    }
    // Para outras rotas, exibe uma mensagem de perfil incompleto.
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
  return <>{children}</>;
}