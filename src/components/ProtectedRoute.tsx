console.log("⚡ ProtectedRoute usando useAuth de:", import.meta.url);

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
    authLoading,
  } = useAuth();

  const location = useLocation();

  // 1 — Esperar sessão inicial OU carregamento do Supabase (TOKEN_REFRESHED, SIGNED_IN)
  if (!initialSessionChecked || authLoading) {
    console.log(
      `ProtectedRoute (${location.pathname}): Esperando carregamento completo... initialSessionChecked=${initialSessionChecked}, authLoading=${authLoading}`
    );
    return <FullPageLoader message="Verificando acesso..." />;
  }

  // 2 — Quando tudo já carregou, verificar usuário/perfil
  if (!user || !profile) {
    console.log(
      `ProtectedRoute (${location.pathname}): Sem usuário ou perfil → login`
    );
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3 — Acesso liberado
  console.log(
    `ProtectedRoute (${location.pathname}): Acesso concedido. User: ${user.id}, Role: ${profile.role}`
  );

  return <>{children}</>;
}