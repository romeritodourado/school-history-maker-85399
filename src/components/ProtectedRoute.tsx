// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import FullPageLoader from "@/components/FullPageLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, initialSessionChecked, sessionLoading, authLoading } = useAuth();
  const location = useLocation();

  console.log(
    `ProtectedRoute (${location.pathname}): initialSessionChecked=${initialSessionChecked}, sessionLoading=${sessionLoading}, authLoading=${authLoading}, user=${user?.id ?? "null"}`
  );

  // Enquanto não sabemos o estado inicial da sessão, mostrar loader
  if (!initialSessionChecked || sessionLoading || authLoading) {
    return <FullPageLoader message="Verificando sessão..." />;
  }

  // Depois que o estado inicial foi verificado, redirecionar se necessário
  if (!user || !profile) {
    console.log(`ProtectedRoute (${location.pathname}): Sem usuário/perfil → redirecionando para /login`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Acesso liberado
  return <>{children}</>;
}
on.pathname}): Acesso concedido → user=${user.id}, role=${profile.role}`
  );

  return <>{children}</>;
}