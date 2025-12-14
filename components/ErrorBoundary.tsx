import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * ErrorBoundary - Catches React errors and displays fallback UI
 *
 * Features:
 * - Captures errors in component tree
 * - Displays user-friendly error message
 * - Provides recovery actions (refresh, home)
 * - Logs errors for debugging
 *
 * Usage:
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static override getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    // Update state to trigger fallback UI
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: Send to error reporting service (Sentry, etc.)
    // Example: Sentry.captureException(error);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleRefresh = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                    <AlertTriangle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      Oups ! Une erreur s'est produite
                    </h1>
                    <p className="text-white/90 text-sm mt-1">
                      L'application a rencontré un problème inattendu
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Details */}
              <div className="p-6">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-6">
                  <h3 className="text-sm font-bold text-slate-700 mb-2">
                    Détails de l'erreur
                  </h3>
                  <p className="text-sm text-slate-600 font-mono bg-white rounded p-3 border border-slate-200">
                    {this.state.error?.message || 'Erreur inconnue'}
                  </p>
                </div>

                {/* Development Mode: Show Stack Trace */}
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mb-6">
                    <summary className="text-sm font-medium text-slate-600 cursor-pointer hover:text-slate-800 mb-2">
                      Stack Trace (développement)
                    </summary>
                    <pre className="text-xs text-slate-600 bg-slate-900 text-slate-100 rounded-lg p-4 overflow-auto max-h-64 border border-slate-700">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.handleReset}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Réessayer
                  </button>
                  <button
                    onClick={this.handleRefresh}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Recharger la page
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Retour accueil
                  </button>
                </div>

                {/* Help Text */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Besoin d'aide ?</strong> Si le problème persiste, contactez le support technique avec le message d'erreur ci-dessus.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
