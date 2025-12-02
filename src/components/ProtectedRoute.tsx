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
  requiredRoles?: AppRole[];
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const {
    user,
    profile,
    initialSessionChecked, // sessionLoading não é mais necessário aqui
  } = useAuth();

  const location = useLocation();

  // 1 — Esperar apenas pela sessão inicial
  // Se initialSessionChecked for false, significa que a verificação ainda não terminou.
  if (!initialSessionChecked) {
    console.log(`ProtectedRoute (${location.pathname}): Aguardando sessão inicial...`);
    return <FullPageLoader message="Verificando acesso..." />;
  }

  // 2 — Se não há usuário ou perfil → login
  // initialSessionChecked agora é true, então a verificação inicial terminou.
  // Se user ou profile ainda são null, significa que não há sessão ativa.
  if (!user || !profile) {
    console.log(`ProtectedRoute (${location.pathname}): Sem usuário ou perfil → login`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3 — Acesso liberado
  console.log(
    `ProtectedRoute (${location.pathname}): Acesso concedido. User: ${user.id}, Role: ${profile.role}`
  );

  return <>{children}</>;
}