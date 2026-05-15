import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional fallback renderer. When omitted, a default friendly screen is shown. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Optional label so logs identify which boundary tripped. */
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global ErrorBoundary — guarantees the app never renders a fully blank/black
 * screen. Any uncaught render error is caught here and a friendly recovery UI
 * is shown with "Reload" and "Clear local data & reload" actions.
 *
 * This is the last line of defense against the "tela preta" bug class:
 *  - Corrupt save / localStorage breaking a render
 *  - Unexpected exception inside a deeply-nested component
 *  - Version migration failure leaving state inconsistent
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the error so debugging tools can pick it up.
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`, error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  reload = () => {
    window.location.reload();
  };

  hardReset = () => {
    try {
      // Preserve theme so the reload doesn't flash white.
      const theme = localStorage.getItem('flm-theme');
      localStorage.clear();
      sessionStorage.clear();
      if (theme) localStorage.setItem('flm-theme', theme);
    } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback && this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }

    const message = this.state.error?.message || 'Erro desconhecido ao renderizar a tela.';

    return (
      <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Algo deu errado</h1>
              <p className="text-xs text-muted-foreground">O jogo encontrou um erro inesperado.</p>
            </div>
          </div>

          <div className="text-xs bg-muted/40 border border-border/40 rounded-lg p-3 text-muted-foreground font-mono break-words max-h-48 overflow-auto whitespace-pre-wrap">
            {message}
            {this.state.error?.stack ? `\n\n${this.state.error.stack.split('\n').slice(0, 6).join('\n')}` : ''}
          </div>

          <p className="text-xs text-muted-foreground">
            Tente recarregar. Se o erro persistir, use "Limpar dados locais" para resetar caches do navegador
            (seu progresso na nuvem é mantido).
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={this.reload}
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
            >
              <RotateCw className="h-4 w-4" /> Recarregar jogo
            </button>
            <button
              onClick={this.hardReset}
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md border border-border text-sm font-medium hover:bg-muted/40 transition"
            >
              <Home className="h-4 w-4" /> Limpar dados locais e recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
