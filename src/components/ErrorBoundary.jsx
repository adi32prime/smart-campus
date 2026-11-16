import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-8 text-center">
          <h1 className="text-2xl font-bold mb-3">This page encountered an error</h1>
          <p className="text-sm text-slate-500 mb-5 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-5 py-2.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}