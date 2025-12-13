import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button'; // Usando o componente Button do shadcn/ui

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('💥 Erro de autenticação:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Redirecionar para login em caso de erro crítico
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-destructive/10 p-4">
          <div className="bg-card p-8 rounded-lg shadow-lg text-center max-w-md">
            <h2 className="text-2xl font-bold text-destructive mb-4">Erro de Autenticação Crítico</h2>
            <p className="mb-6 text-muted-foreground">Ocorreu um problema ao verificar sua autenticação. Isso pode indicar um estado corrompido.</p>
            <Button 
              variant="destructive"
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/login';
              }}
            >
              Limpar Dados e Voltar para o Login
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;