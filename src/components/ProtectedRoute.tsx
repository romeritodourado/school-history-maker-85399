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

  // Se ainda estiver carregando o estado de autenticação (sessão e perfil), mostra o spinner
  if (loading) {
    console.log(`ProtectedRoute (${location.pathname}): Carregando estado de autenticação...`);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando...</span>
      </div>
    );
  }

  // Se não estiver carregando e não houver usuário, redireciona para a página de login
  if (!user) {
    console.log(`ProtectedRoute (${location.pathname}): Nenhum usuário, redirecionando para /login`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se o usuário existir, mas não tiver as roles necessárias, nega o acesso
  if (requiredRoles && requiredRoles.length > 0 && (!role || !requiredRoles.includes(role as AppRole))) {
    console.log(`ProtectedRoute (${location.pathname}): Acesso negado. Role do usuário: ${role}, Roles requeridas: ${requiredRoles.join(', ')}`);
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

  // Se todas as verificações passarem, renderiza os filhos
  console.log(`ProtectedRoute (${location.pathname}): Acesso concedido. User: ${user.id}, Role: ${role}`);
  return <>{children}</>;
}