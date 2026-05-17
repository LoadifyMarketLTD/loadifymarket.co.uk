import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { captureError } from '../lib/errorTracking';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary — catches unhandled render errors and shows
 * a friendly fallback instead of a blank white screen.
 *
 * Errors are forwarded to the errorTracking module so they are persisted
 * via the `error-report` Netlify function in production.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Forward to the centralised error-tracking module so the error is
    // persisted via the error-report Netlify function in production.
    captureError(error, `ErrorBoundary: ${info.componentStack ?? ''}`);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Full page reload is intentional here: we want to completely reset
    // the React tree and all application state after an unhandled error.
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center px-4">
          <div className="rounded-xl p-6 max-w-md w-full text-center p-10" style={{ background: "linear-gradient(145deg, #121A2B, #182235)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-5xl mb-4">⚠️</p>
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 mb-2">
              An unexpected error occurred. Our team has been notified.
            </p>
            {this.state.error && (
              <p className="text-gray-300 text-xs font-mono mb-6 break-all">
                Something went wrong. Please try again.
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="btn-primary"
            >
              Go to Home Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
