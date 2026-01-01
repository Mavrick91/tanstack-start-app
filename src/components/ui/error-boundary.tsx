import { useRouter } from '@tanstack/react-router'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

import { Button } from './button'

import type { ErrorComponentProps } from '@tanstack/react-router'

export const DefaultErrorComponent = ({
  error,
  reset,
}: ErrorComponentProps) => {
  const router = useRouter()

  const handleRetry = () => {
    reset()
    router.invalidate()
  }

  const handleGoHome = () => {
    router.navigate({ to: '/' })
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : 'An unexpected error occurred'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleRetry} variant="default" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
          <Button onClick={handleGoHome} variant="outline" className="gap-2">
            <Home className="w-4 h-4" />
            Go home
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && error instanceof Error && (
          <details className="mt-6 text-left">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Error details
            </summary>
            <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-48">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
