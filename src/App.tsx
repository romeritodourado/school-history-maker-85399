import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import InitialSuperAdminSetup from "./pages/InitialSuperAdminSetup";
import MunicipalNetworkSetup from "./pages/MunicipalNetworkSetup";
import Dashboard from "./pages/Dashboard";
import MunicipalDashboard from "./pages/MunicipalDashboard";
import ManageMunicipalities from "./pages/ManageMunicipalities";
import StudentList from "./pages/StudentList";
import CreateTranscript from "./pages/CreateTranscript";
import ViewTranscript from "./pages/ViewTranscript";
import WorkloadManagement from "./pages/WorkloadManagement";
import Schools from "./pages/Schools";
import Users from "./pages/Users";
import ValidateTranscript from "./pages/ValidateTranscript";
import AccountSettings from "./pages/AccountSettings";
import { useEffect } from "react";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./components/ThemeProvider";
import { useTheme } from "next-themes"; // Importar useTheme

const queryClient = new QueryClient();

// Componente para logar o tema atual
const ThemeLogger = () => {
  const { theme } = useTheme();
  useEffect(() => {
    console.log("Current theme from ThemeProvider:", theme);
  }, [theme]);
  return null;
};

const AuthRedirectHandler = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user) { // Se o carregamento terminou e o usuário está autenticado
      const publicOnlyPaths = ['/login', '/initial-superadmin-setup', '/municipal-network-setup']; // Caminhos que usuários autenticados não deveriam estar
      
      if (publicOnlyPaths.includes(location.pathname)) {
        navigate('/', { replace: true }); // Redireciona para o dashboard
      }
    }
  }, [user, loading, navigate, location.pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <ThemeLogger /> {/* Adicionado ThemeLogger aqui */}
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthRedirectHandler />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/initial-superadmin-setup" element={<InitialSuperAdminSetup />} />
              <Route path="/municipal-network-setup" element={<MunicipalNetworkSetup />} />
              <Route path="/validar" element={<ValidateTranscript />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/municipal-dashboard/:municipalityId" element={
                <ProtectedRoute requiredRoles={['super_admin', 'municipal_secretary', 'network_manager']}>
                  <MunicipalDashboard />
                </ProtectedRoute>
              } />
              <Route path="/manage-municipalities" element={
                <ProtectedRoute requiredRoles={['super_admin']}>
                  <ManageMunicipalities />
                </ProtectedRoute>
              } />
              <Route path="/lista-alunos" element={
                <ProtectedRoute requiredRoles={['super_admin', 'municipal_secretary', 'network_manager', 'school_admin', 'secretary', 'assistente_administrativo']}>
                  <StudentList />
                </ProtectedRoute>
              } />
              <Route path="/novo-historico" element={
                <ProtectedRoute requiredRoles={['super_admin', 'municipal_secretary', 'network_manager', 'school_admin', 'secretary', 'assistente_administrativo']}>
                  <CreateTranscript />
                </ProtectedRoute>
              } />
              <Route path="/visualizar/:id" element={
                <ProtectedRoute requiredRoles={['super_admin', 'municipal_secretary', 'network_manager', 'school_admin', 'secretary', 'assistente_administrativo']}>
                  <ViewTranscript />
                </ProtectedRoute>
              } />
              <Route path="/editar/:id" element={
                <ProtectedRoute requiredRoles={['super_admin', 'municipal_secretary', 'network_manager', 'school_admin', 'secretary', 'assistente_administrativo']}>
                  <CreateTranscript />
                </ProtectedRoute>
              } />
              <Route path="/carga-horaria" element={
                <ProtectedRoute requiredRoles={['super_admin', 'municipal_secretary', 'network_manager', 'school_admin', 'secretary']}>
                  <WorkloadManagement />
                </ProtectedRoute>
              } />
              <Route path="/escolas" element={
                <ProtectedRoute requiredRoles={['super_admin', 'municipal_secretary', 'network_manager']}>
                  <Schools />
                </ProtectedRoute>
              } />
              <Route path="/usuarios" element={
                <ProtectedRoute requiredRoles={['super_admin', 'municipal_secretary', 'network_manager', 'school_admin']}>
                  <Users />
                </ProtectedRoute>
              } />
              <Route path="/account-settings" element={
                <ProtectedRoute>
                  <AccountSettings />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;