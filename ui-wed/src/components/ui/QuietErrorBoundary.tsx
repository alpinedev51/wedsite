import { Component, type ReactNode } from "react";

// Renders `fallback` (nothing, by default) if anything inside throws, instead
// of letting the error take over the whole page. For optional extras, like
// the lazy-loaded Travel map, whose download can fail on a flaky connection
// or after a redeploy.
class QuietErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed
      ? (this.props.fallback ?? null)
      : this.props.children;
  }
}

export default QuietErrorBoundary;
