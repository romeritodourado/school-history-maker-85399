console.log("⚡ ProtectedRoute ativo:", import.meta.url);

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import FullPageLoader from "@/components/FullPageLoader";

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

  // 1 — ESPERAR sessão inicial **e** o Supabase estabilizar os eventos de auth
  if (!initialSessionChecked || authLoading) {
    console.log(
      `ProtectedRoute (${location.pathname}): Aguardando sessão estabilizar... initialSessionChecked=${initialSessionChecked}, authLoading=${authLoading}`
    );
    return <FullPageLoader message="Verificando sessão..." />;
  }

  // 2 — Depois de estabilizado, agora sim verificar usuário e perfil
  if (!user || !profile) {
    console.log(
      `ProtectedRoute (${location.pathname}): Sem usuário/perfil após estabilizar → redirecionando para login`
    );
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3 — Tudo carregado e sessão válida
  console.log(
    `ProtectedRoute (${location.pathname}): Acesso concedido → user=${user.id}, role=${profile.role}`
  );

  return <>{children}</>;
}