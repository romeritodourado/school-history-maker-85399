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
import ManageMunicipalities from "./pages/ManageMunicipalities"; // Importar a nova página
import StudentList from "./pages/StudentList";
import CreateTranscript from "./pages/CreateTranscript";
import ViewTranscript from "./pages/ViewTranscript";
import WorkloadManagement from "./pages/WorkloadManagement";
import Schools from "./pages/Schools";
import Users from "./pages/Users";
import ValidateTranscript from "./pages/ValidateTranscript";
import AccountSettings from "./pages/AccountSettings";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

const queryClient = new QueryClient();

const AuthRedirectHandler = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      const publicPaths = ['/login', '/initial-superadmin-setup', '/municipal-network-setup', '/validar'];
      const isMunicipalDashboardRoute = location.pathname.startsWith('/municipal-dashboard/');
      
      if (!publicPaths.includes(location.pathname) && !isMunicipalDashboardRoute) {
        navigate('/login', { replace: true });
      }
    }
  }, [user, loading, navigate, location.pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
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
              <ProtectedRoute requiredRoles={['super_admin']}>
                <MunicipalDashboard />
              </ProtectedRoute>
            } />
            <Route path="/manage-municipalities" element={ {/* Nova rota */}
              <ProtectedRoute requiredRoles={['super_admin']}>
                <ManageMunicipalities />
              </ProtectedRoute>
            } />
            <Route path="/lista-alunos" element={
              <ProtectedRoute requiredRoles={['super_admin', 'municipal_admin', 'school_admin', 'secretary', 'teacher']}>
                <StudentList />
              </ProtectedRoute>
            } />
            <Route path="/novo-historico" element={
              <ProtectedRoute requiredRoles={['super_admin', 'municipal_admin', 'school_admin', 'secretary', 'teacher']}>
                <CreateTranscript />
              </ProtectedRoute>
            } />
            <Route path="/visualizar/:id" element={
              <ProtectedRoute requiredRoles={['super_admin', 'municipal_admin', 'school_admin', 'secretary', 'teacher']}>
                <ViewTranscript />
              </ProtectedRoute>
            } />
            <Route path="/editar/:id" element={
              <ProtectedRoute requiredRoles={['super_admin', 'municipal_admin', 'school_admin', 'secretary', 'teacher']}>
                <CreateTranscript />
              </ProtectedRoute>
            } />
            <Route path="/carga-horaria" element={
              <ProtectedRoute requiredRoles={['super_admin', 'municipal_admin', 'school_admin', 'secretary']}>
                <WorkloadManagement />
              </ProtectedRoute>
            } />
            <Route path="/escolas" element={
              <ProtectedRoute requiredRoles={['super_admin', 'municipal_admin']}>
                <Schools />
              </ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute requiredRoles={['super_admin', 'municipal_admin', 'school_admin']}>
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
  </QueryClientProvider>
);

export default App;