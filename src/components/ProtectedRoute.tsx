import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import FullPageLoader from "@/components/FullPageLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, initialSessionChecked, sessionLoading, authLoading } = useAuth();
  const location = useLocation();
  const [checkComplete, setCheckComplete] = useState(false);

  // Log para debug
  useEffect(() => {
    console.log(`ProtectedRoute (${location.pathname}):`, {
      initialSessionChecked,
      sessionLoading,
      authLoading,
      user: user?.id || 'null',
      profile: profile?.id || 'null',
      checkComplete
    });
  }, [initialSessionChecked, sessionLoading, authLoading, user, profile, location.pathname, checkComplete]);

  // Determinar quando a verificação está completa
  useEffect(() => {
    if (initialSessionChecked && !sessionLoading && !authLoading) {
      setCheckComplete(true);
    } else {
      setCheckComplete(false);
    }
  }, [initialSessionChecked, sessionLoading, authLoading]);

  // 1. Se ainda está verificando, mostrar loader
  if (!initialSessionChecked || sessionLoading || authLoading) {
    console.log(`ProtectedRoute: Aguardando verificação de autenticação...`);
    return <FullPageLoader message="Verificando autenticação..." />;
  }

  // 2. Se a verificação está completa e não tem usuário/perfil, redirecionar
  if (checkComplete && (!user || !profile)) {
    console.log(`ProtectedRoute: Usuário não autenticado → redirecionando para /login`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Se a verificação está completa mas ainda não temos certeza, aguardar
  if (!checkComplete) {
    return <FullPageLoader message="Finalizando verificação..." />;
  }

  // 4. Usuário autenticado com sucesso, renderizar children
  console.log(`ProtectedRoute: Acesso permitido para ${user?.id}`);
  return <>{children}</>;
}