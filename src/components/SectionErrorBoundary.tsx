import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { captureError } from '../lib/errorTracking';

interface Props {
  children: ReactNode;
  /** Optional label shown in the inline fallback (default: "section"). */
  label?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Lightweight error boundary for **below-the-fold page sections**.
 *
 * Wrap any `React.lazy()` chunk or data-fetching component that should not
 * crash the entire page when it fails to load:
 *
 * ```tsx
 * <SectionErrorBoundary>
 *   <Suspense fallback={<div className="h-40 animate-pulse bg-gray-100 rounded-xl" />}>
 *     <TrendingProducts />
 *   </Suspense>
 * </SectionErrorBoundary>
 * ```
 *
 * If the chunk fetch fails (network error, stale deploy hash, etc.) or the
 * component throws during render, this boundary shows a small inline error
 * notice instead of propagating the error up to the global ErrorBoundary and
 * wiping the entire page.
 */
export default class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error, `SectionErrorBoundary[${this.props.label ?? 'section'}]: ${info.componentStack ?? ''}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center py-8 px-4 text-sm text-muted-foreground">
          <span>This section failed to load.</span>
          <button
            className="ml-3 underline hover:text-foreground transition-colors"
            onClick={() => {
              // A full page reload is intentional here: when a JS chunk fails to
              // fetch it is almost always because the content-hash in the URL
              // no longer matches any file on the server (stale cache after a
              // new deploy).  Re-mounting the component in-place would retry the
              // same stale URL and fail again.  A reload fetches the latest
              // index.html which references the new chunk hashes.
              window.location.reload();
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
