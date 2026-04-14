import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertOctagon, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-zinc-950 p-6">
          <Card className="max-w-md border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-col items-center gap-2 text-center">
              <div className="rounded-full bg-red-500/10 p-3">
                <AlertOctagon className="h-10 w-10 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 text-center">
              <p className="text-zinc-400 text-sm">
                The application encountered an unexpected error. This has been logged and we're looking into it.
              </p>
              {this.state.error && (
                <pre className="w-full overflow-auto rounded bg-black/50 p-3 text-left text-[10px] text-zinc-600">
                  {this.state.error.message}
                </pre>
              )}
              <Button 
                onClick={() => window.location.reload()}
                className="bg-orange-600 hover:bg-orange-700 w-full"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reload Application
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
