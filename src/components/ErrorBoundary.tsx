import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../utils/logger';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ReactErrorBoundary', 'Uncaught component exception crashed the UI render tree', {
      error: error.toString(),
      stack: errorInfo.componentStack
    });
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f1115] text-[#e2e8f0] p-10 flex flex-col items-center justify-center font-mono">
          <div className="bg-[#1a1d24] border border-[#ef4444] p-8 rounded-xl w-full max-w-4xl shadow-2xl">
            <h1 className="text-2xl text-[#ef4444] font-bold mb-4 flex items-center gap-3">
              <span className="text-3xl">⚠️</span> Application Render Crash
            </h1>
            <h2 className="text-lg mb-4 text-[#cbd5e1] font-semibold">{this.state.error && this.state.error.toString()}</h2>
            <div className="bg-[#0f1115] border border-[#2e3440] p-4 rounded-lg overflow-auto max-h-96">
               <pre className="text-sm text-[#94a3b8] whitespace-pre-wrap">
                 {this.state.errorInfo && this.state.errorInfo.componentStack}
               </pre>
            </div>
            <div className="mt-8 flex gap-4">
              <button 
                className="bg-[#3b82f6] hover:bg-[#2563eb] px-6 py-2 rounded-lg text-white font-medium transition-colors"
                onClick={() => window.location.href = '/'}
              >
                Reset to Global Dashboard
              </button>
              <button 
                className="bg-[#334155] hover:bg-[#475569] px-6 py-2 rounded-lg text-white font-medium transition-colors"
                onClick={() => window.location.reload()}
              >
                Reload Context
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
