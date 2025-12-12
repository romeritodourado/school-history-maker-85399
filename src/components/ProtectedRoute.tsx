import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import FullPageLoader from "@/components/FullPageLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, isLoading, initialSessionChecked } = useAuth();
  const location = useLocation();

  // Debug
  console.log(`ProtectedRoute (${location.pathname}):`, {
    isLoading,
    initialSessionChecked,
    user: user?.id || 'null',
    profile: profile?.id || 'null'
  });

  // 1. Se ainda está carregando, mostrar loader
  if (isLoading || !initialSessionChecked) {
    console.log(`ProtectedRoute: Carregando...`);
    return <FullPageLoader message="Verificando autenticação..." />;
  }

  // 2. Se não tem usuário ou perfil, redirecionar
  if (!user || !profile) {
    console.log(`ProtectedRoute: Redirecionando para login`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Usuário autenticado
  console.log(`ProtectedRoute: Acesso permitido para ${user.id}`);
  return <>{children}</>;
}