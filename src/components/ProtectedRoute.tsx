import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import FullPageLoader from "@/components/FullPageLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

console.log("🛡️ ProtectedRoute carregado");

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, isLoading, isInitialized } = useAuth();
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    console.log("🔍 ProtectedRoute análise:", {
      path: location.pathname,
      isLoading,
      isInitialized,
      user: user?.id || 'null',
      profile: profile?.id || 'null',
      authStatus
    });

    // Só decidir quando a inicialização estiver completa
    if (isInitialized && !isLoading) {
      if (user && profile) {
        console.log("✅ ProtectedRoute: Usuário autenticado");
        setAuthStatus('authenticated');
      } else {
        console.log("🔒 ProtectedRoute: Usuário não autenticado");
        setAuthStatus('unauthenticated');
      }
    } else {
      console.log("⏳ ProtectedRoute: Aguardando verificação...");
      setAuthStatus('checking');
    }
  }, [isLoading, isInitialized, user, profile, location.pathname, authStatus]);

  // 1. Se ainda está verificando, mostrar loader
  if (authStatus === 'checking') {
    console.log("🔄 ProtectedRoute: Mostrando loader");
    return <FullPageLoader message="Verificando autenticação..." />;
  }

  // 2. Se não autenticado, redirecionar
  if (authStatus === 'unauthenticated') {
    console.log("➡️ ProtectedRoute: Redirecionando para /login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Autenticado
  console.log("🎯 ProtectedRoute: Renderizando conteúdo para", user?.id);
  return <>{children}</>;
}