import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
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
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./components/ThemeProvider";

// Configura o QueryClient com um staleTime padrão de 5 minutos
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/initial-superadmin-setup" element={<InitialSuperAdminSetup />} />
              <Route path="/municipal-network-setup" element={
                <ProtectedRoute>
                  <MunicipalNetworkSetup />
                </ProtectedRoute>
              } />
              <Route path="/validar" element={<ValidateTranscript />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/municipal-dashboard/:municipalityId" element={
                <ProtectedRoute>
                  <MunicipalDashboard />
                </ProtectedRoute>
              } />
              <Route path="/manage-municipalities" element={
                <ProtectedRoute>
                  <ManageMunicipalities />
                </ProtectedRoute>
              } />
              <Route path="/lista-alunos" element={
                <ProtectedRoute>
                  <StudentList />
                </ProtectedRoute>
              } />
              <Route path="/novo-historico" element={
                <ProtectedRoute>
                  <CreateTranscript />
                </ProtectedRoute>
              } />
              <Route path="/visualizar/:id" element={
                <ProtectedRoute>
                  <ViewTranscript />
                </ProtectedRoute>
              } />
              <Route path="/editar/:id" element={
                <ProtectedRoute>
                  <CreateTranscript />
                </ProtectedRoute>
              } />
              <Route path="/carga-horaria" element={
                <ProtectedRoute>
                  <WorkloadManagement />
                </ProtectedRoute>
              } />
              <Route path="/escolas" element={
                <ProtectedRoute>
                  <Schools />
                </ProtectedRoute>
              } />
              <Route path="/usuarios" element={
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              } />
              <Route path="/account-settings" element={
                <ProtectedRoute>
                  <AccountSettings />
                </ProtectedRoute>
              } />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;