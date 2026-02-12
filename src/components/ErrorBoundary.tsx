import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
            Algo deu errado
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center max-w-md">
            {this.state.error?.message || 'Erro inesperado na aplicacao'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#3b82f6' }}
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
