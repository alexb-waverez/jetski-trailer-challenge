import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React render error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 text-center space-y-5">
            <div className="w-12 h-12 bg-red-950/60 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Application Encountered an Error</h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                An unexpected interface issue occurred. You can reload the application to restore your session.
              </p>
              {this.state.error?.message && (
                <div className="bg-gray-900/80 p-3 rounded text-left font-mono text-xs text-red-300 border border-red-500/20 overflow-x-auto max-h-32 mt-3">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
