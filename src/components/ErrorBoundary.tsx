import React from "react";

type Props = { children: React.ReactNode; fallback?: React.ReactNode };

export class ErrorBoundary extends React.Component<Props, { hasError: boolean; error?: any }> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // log to console
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);

    // report to server for debugging (best-effort)
    try {
      const endpoint = (import.meta.env.VITE_API_BASE || '') + '/clientLog';
      const payload = {
        ctx: 'ErrorBoundary',
        err: (error && error.message) ? String(error.message) : String(error),
        stack: (error && error.stack) ? String(error.stack) : undefined,
        info,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        ts: new Date().toISOString()
      };
      // prefer fetch but keep try/catch to avoid throwing
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
    } catch (e) { /* ignore */ }
  }

  render() {
    if (this.state.hasError) {
      const fallback = this.props.fallback ?? (
        <div className="p-6 bg-red-50 text-red-800 rounded-md max-w-3xl mx-auto mt-6">
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="mb-4">An unexpected error occurred while rendering the page. We've recorded this error for debugging.</p>
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-white border rounded" onClick={() => window.location.reload()}>Reload page</button>
            <button className="px-3 py-2 bg-white border rounded" onClick={() => { if (typeof window !== 'undefined') { window.location.href = (window.location.href.split('#')[0] + '#open-devtools'); } }}>Open devtools</button>
          </div>
        </div>
      );
      return fallback;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
