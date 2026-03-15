
import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      let isPermissionError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.error.includes('Missing or insufficient permissions')) {
            isPermissionError = true;
            errorMessage = "Você não tem permissão para acessar estes dados ou realizar esta operação.";
          }
        }
      } catch (e) {
        // Not a JSON error message
        if (this.state.error?.message.includes('Missing or insufficient permissions')) {
          isPermissionError = true;
          errorMessage = "Você não tem permissão para acessar estes dados ou realizar esta operação.";
        }
      }

      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-gray-900 border border-red-500/20 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl">
            <div className="bg-red-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
              <AlertTriangle className="text-red-500" size={40} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Ops! Algo deu errado</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                {errorMessage}
              </p>
              {isPermissionError && (
                <p className="text-amber-500/60 text-[10px] font-bold uppercase tracking-widest mt-4">
                  Dica: Verifique se você está logado com a conta correta.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-white text-black hover:bg-gray-200 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <RefreshCcw size={16} />
                Tentar Novamente
              </button>
              
              <button 
                onClick={this.handleReset}
                className="w-full bg-gray-800 text-white hover:bg-gray-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <Home size={16} />
                Voltar ao Início
              </button>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <p className="text-[9px] text-gray-600 font-mono break-all">
                {this.state.error?.name}: {this.state.error?.message.substring(0, 100)}...
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
