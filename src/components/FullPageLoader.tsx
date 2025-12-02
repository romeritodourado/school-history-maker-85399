import React from 'react';
import { Loader2 } from 'lucide-react';

interface FullPageLoaderProps {
  message?: string;
}

const FullPageLoader = ({ message = "Carregando..." }: FullPageLoaderProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="flex items-center text-primary">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span className="text-lg">{message}</span>
      </div>
    </div>
  );
};

export default FullPageLoader;