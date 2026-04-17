import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      let errorMessage = "Something went wrong.";
      if (error) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) {
            errorMessage = `API Error: ${parsed.error} (${parsed.operationType} at ${parsed.path})`;
          }
        } catch {
          errorMessage = error.message;
        }
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-bg-primary">
          <div className="p-8 bg-white rounded-[40px] shadow-2xl border-4 border-brand-primary max-w-sm">
            <h1 className="text-3xl font-bold text-brand-primary mb-4">
              Oops!
            </h1>
            <p className="text-brand-ink opacity-70 mb-8">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
