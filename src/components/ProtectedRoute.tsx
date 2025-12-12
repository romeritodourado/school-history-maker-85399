import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import FullPageLoader from "@/components/FullPageLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

console.log("🛡️ ProtectedRoute.tsx CARREGADO");

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, isLoading, initialSessionChecked } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log("🛡️ ProtectedRoute: Renderizado", {
      path: location.pathname,
      isLoading,
      initialSessionChecked,
      user: user?.id || 'null',
      profile: profile?.id || 'null',
      timestamp: new Date().toISOString()
    });
  }, [location.pathname, isLoading, initialSessionChecked, user, profile]);

  // Debug em tempo real
  console.log("🛡️ ProtectedRoute: Estado atual", {
    isLoading,
    initialSessionChecked,
    user: user?.id || 'null',
    profile: profile?.id || 'null'
  });

  // REGRA SIMPLES: Se ainda está carregando ou não verificou, mostrar loader
  if (isLoading || !initialSessionChecked) {
    console.log("🛡️ ProtectedRoute: Mostrando loader (carregando/verificando)");
    return <FullPageLoader message="Verificando autenticação..." />;
  }

  // Se verificou e não tem usuário/perfil, redirecionar
  if (!user || !profile) {
    console.log("🛡️ ProtectedRoute: Redirecionando para /login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Usuário autenticado
  console.log("🛡️ ProtectedRoute: ✅ Acesso permitido para", user.id);
  return <>{children}</>;
}