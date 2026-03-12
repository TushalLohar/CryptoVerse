import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <p className="text-text-1 text-[16px] font-bold">
            Something went wrong
          </p>

          <p className="text-text-3 text-[13px]">{this.state.error?.message}</p>

          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-lg bg-crypto-blue text-white text-[13px] font-semibold"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
