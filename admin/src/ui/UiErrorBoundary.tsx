import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  title: string;
  message: string;
  reloadLabel: string;
  resetKey?: string | number;
  className?: string;
};

type State = { error: Error | null };

function isChunkLoadError(error: Error): boolean {
  const text = `${error.name} ${error.message}`.toLowerCase();
  return (
    text.includes('chunkloaderror') ||
    text.includes('dynamically imported module') ||
    text.includes('module script') ||
    text.includes('/assets/js/chunks/')
  );
}

function recoverStaleChunkOnce(error: Error): boolean {
  if (!isChunkLoadError(error)) return false;
  const build = window.FRKT_BOOT?.assetBuildId || window.FRKT_BOOT?.version || 'unknown';
  const key = `frkt:chunk-reload:${build}`;
  try {
    const previous = Number(window.sessionStorage.getItem(key) || 0);
    if (previous > 0 && Date.now() - previous < 5 * 60 * 1000) return false;
    window.sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // Reload recovery still works when session storage is unavailable.
  }
  window.location.reload();
  return true;
}

/** Keeps a failed lazy screen or Inspector tool from blanking the whole SPA. */
export class UiErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep diagnostics available in the browser without exposing them in the UI.
    console.error('[FoldRocket] UI render failed', error, info.componentStack);
    recoverStaleChunkOnce(error);
  }

  componentDidUpdate(previous: Props): void {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className={this.props.className || 'frkt-state frkt-state--error'} role="alert">
        <h2>{this.props.title}</h2>
        <p>{this.props.message}</p>
        <button type="button" className="button button-primary" onClick={() => window.location.reload()}>
          {this.props.reloadLabel}
        </button>
      </div>
    );
  }
}
