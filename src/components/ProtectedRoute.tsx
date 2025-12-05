import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import FullPageLoader from '@/components/FullPageLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const {
    user,
    profile,
    initialSessionChecked,
    authLoading, // Adicionado authLoading
  } = useAuth();

  const location = useLocation();

  // 1 — Se a sessão inicial não terminou OU ainda está carregando perfil/token
  if (!initialSessionChecked || authLoading) {
    console.log(`ProtectedRoute (${location.pathname}): Esperando carregamento completo...`);
    return <FullPageLoader message="Carregando..." />;
  }

  // 2 — Sem usuário ou perfil → login
  if (!user || !profile) {
    console.log(`ProtectedRoute (${location.pathname}): Sem usuário ou perfil → login`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3 — Tudo OK
  console.log(
    `ProtectedRoute (${location.pathname}): Acesso concedido. User: ${user.id}, Role: ${profile.role}`
  );

  return <>{children}</>;
}