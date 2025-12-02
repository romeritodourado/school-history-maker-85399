import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import FullPageLoader from '@/components/FullPageLoader';

type AppRole = 
  | 'super_admin' 
  | 'municipal_secretary' 
  | 'network_manager' 
  | 'school_admin' 
  | 'secretary';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[]; // Mantido para compatibilidade, mas a lógica de verificação de role será removida daqui
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, profile, sessionLoading, authLoading, operationLoading, initialSessionChecked } = useAuth();
  const location = useLocation();

  // 1. Se a sessão inicial ainda não foi verificada, mostra o loader de verificação de acesso
  if (!initialSessionChecked) {
    console.log(`ProtectedRoute (${location.pathname}): Aguardando sessão inicial...`);
    return <FullPageLoader message="Verificando acesso..." />;
  }

  // 2. Se a sessão inicial foi verificada, mas ainda estamos carregando o perfil ou uma operação de auth
  if (sessionLoading || authLoading || operationLoading) {
    console.log(`ProtectedRoute (${location.pathname}): Carregando dados...`);
    return <FullPageLoader message="Carregando dados..." />;
  }

  // 3. Se a sessão inicial foi verificada, não há carregamentos ativos, mas não há usuário ou perfil
  // Isso significa que o usuário não está autenticado ou o perfil não pôde ser carregado
  if (!user || !profile) {
    console.log(`ProtectedRoute (${location.pathname}): Nenhum usuário ou perfil, redirecionando para /login`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Se todas as verificações passarem (inicialização completa, sem carregamentos ativos, usuário e perfil existem), renderiza os filhos
  console.log(`ProtectedRoute (${location.pathname}): Acesso concedido. User: ${user.id}, Role: ${profile.role}`);
  return <>{children}</>;
}