import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import FullPageLoader from '@/components/FullPageLoader'; // Importar o novo componente

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
  const { user, loading, initialSessionChecked } = useAuth(); // Usando 'loading' e 'initialSessionChecked'
  const location = useLocation();

  // Se a sessão inicial ainda não foi verificada, mostra o loader de verificação de acesso
  if (!initialSessionChecked) {
    console.log(`ProtectedRoute (${location.pathname}): Aguardando sessão inicial...`);
    return <FullPageLoader message="Verificando acesso..." />;
  }

  // Se houver uma operação de autenticação ativa (login/logout/signup), mostra o loader de carregamento
  if (loading) {
    console.log(`ProtectedRoute (${location.pathname}): Carregando dados...`);
    return <FullPageLoader message="Carregando dados..." />;
  }

  // Se a sessão inicial foi verificada e não há usuário, redireciona para a página de login
  if (!user) {
    console.log(`ProtectedRoute (${location.pathname}): Nenhum usuário, redirecionando para /login`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // A lógica de verificação de roles foi removida daqui.
  // Se a verificação de roles for necessária, ela deve ser implementada
  // dentro dos componentes das páginas ou em um nível superior.

  // Se todas as verificações passarem (inicialização completa e usuário autenticado), renderiza os filhos
  console.log(`ProtectedRoute (${location.pathname}): Acesso concedido. User: ${user.id}`);
  return <>{children}</>;
}