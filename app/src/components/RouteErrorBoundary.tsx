import { Component, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { log } from '../lib/logger';
import { withTranslation } from 'react-i18next';
import type { WithTranslation } from 'react-i18next';

interface Props extends WithTranslation {
  children: ReactNode;
  routePath: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Route-level error boundary
 * Prevents a single route error from crashing the entire app
 */
class RouteErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    log.error(
      `Route Error: ${this.props.routePath}`,
      { component: 'RouteErrorBoundary', route: this.props.routePath },
      error,
      { componentStack: errorInfo.componentStack }
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Navigate to home
    window.location.href = '/';
  };

  render() {
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full space-y-4 text-center">
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold">{t('error.page_error')}</h1>
            <p className="text-muted-foreground">
              {t('error.page_error_message')}
            </p>
            {this.state.error && import.meta.env.DEV && (
              <div className="p-4 bg-muted rounded-md text-left">
                <p className="text-sm font-mono text-destructive">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="mt-2 text-xs text-muted-foreground overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleReset}>{t('error.go_to_home')}</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                {t('error.reload_page')}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const RouteErrorBoundary = withTranslation()(RouteErrorBoundaryClass);
