import type { FallbackProps } from 'react-error-boundary'

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        {error instanceof Error ? error.message : 'An unexpected error occurred.'}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
      >
        Try again
      </button>
    </div>
  )
}
