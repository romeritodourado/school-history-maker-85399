import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import InitialSetup from "./pages/InitialSetup";
import Dashboard from "./pages/Dashboard";
import StudentList from "./pages/StudentList";
import CreateTranscript from "./pages/CreateTranscript";
import ViewTranscript from "./pages/ViewTranscript";
import WorkloadManagement from "./pages/WorkloadManagement";
import Schools from "./pages/Schools";
import Users from "./pages/Users";
import ValidateTranscript from "./pages/ValidateTranscript";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<InitialSetup />} />
            <Route path="/validar" element={<ValidateTranscript />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
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
              <ProtectedRoute requiredRoles={['superadmin', 'adminrede', 'diretor', 'secretario']}>
                <WorkloadManagement />
              </ProtectedRoute>
            } />
            <Route path="/escolas" element={
              <ProtectedRoute requiredRoles={['superadmin', 'adminrede']}>
                <Schools />
              </ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute requiredRoles={['superadmin', 'adminrede', 'diretor']}>
                <Users />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;