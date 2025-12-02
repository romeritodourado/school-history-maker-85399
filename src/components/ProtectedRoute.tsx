import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

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
  const { user, loading, initializing } = useAuth(); // Adicionado 'initializing'
  const location = useLocation();

  // Se ainda estiver inicializando a sessão (primeira carga da página), mostra o spinner
  if (initializing) {
    console.log(`ProtectedRoute (${location.pathname}): Aguardando sessão inicial...`);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando...</span>
      </div>
    );
  }

  // Se não estiver inicializando, mas alguma operação ativa (login/logout) estiver ocorrendo, mostra o spinner
  if (loading) {
    console.log(`ProtectedRoute (${location.pathname}): Carregando...`);
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

  // A lógica de verificação de roles foi removida daqui.
  // Se a verificação de roles for necessária, ela deve ser implementada
  // dentro dos componentes das páginas ou em um nível superior.

  // Se todas as verificações passarem (inicialização completa e usuário autenticado), renderiza os filhos
  console.log(`ProtectedRoute (${location.pathname}): Acesso concedido. User: ${user.id}`);
  return <>{children}</>;
}