import React from 'react';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback({ error, onReset, onClearData }: { error: Error | null; onReset: () => void; onClearData: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-rose-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Algo deu errado</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
          Ocorreu um erro inesperado. Tente recarregar ou, se o problema persistir, limpe os dados.
        </p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-6 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl font-mono break-all max-h-40 overflow-auto text-left">
          {error?.message || 'Erro desconhecido'}<br/>
          {error?.stack?.split('\n').slice(1, 5).join('\n') || ''}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onReset}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} /> Tentar Novamente
          </button>
          <button
            onClick={onClearData}
            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={18} /> Limpar Dados e Recarregar
          </button>
        </div>
      </div>
    </div>
  );
}

class ErrorBoundaryClass extends (React.Component as any)<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    try {
      localStorage.setItem('organizaai_last_error', JSON.stringify({
        message: error?.message || 'Unknown',
        stack: error?.stack || '',
        time: new Date().toISOString()
      }));
    } catch {}
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    try {
      localStorage.setItem('organizaai_last_error', JSON.stringify({
        message: error?.message || 'Unknown',
        stack: error?.stack || '',
        componentStack: errorInfo?.componentStack || '',
        time: new Date().toISOString()
      }));
    } catch {}
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleClearData = () => {
    if (confirm('Isso apagará todos os dados salvos e recarregará o app. Tem certeza?')) {
      localStorage.removeItem('organizaai_data_v2');
      localStorage.removeItem('organizaai_last_backup');
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} onClearData={this.handleClearData} />;
    }
    return this.props.children;
  }
}

export default ErrorBoundaryClass;
