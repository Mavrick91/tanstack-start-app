import { useBlocker, useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'

interface UseUnsavedChangesOptions {
  isDirty: boolean
}

interface UseUnsavedChangesReturn {
  status: 'blocked' | 'idle'
  proceed: () => void
  reset: () => void
}

/**
 * Hook to warn users about unsaved changes when navigating away from a page.
 * Uses TanStack Router's useBlocker for in-app navigation and beforeunload for browser events.
 */
export function useUnsavedChanges({
  isDirty,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const router = useRouter()

  // Use TanStack Router's useBlocker for in-app navigation
  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    withResolver: true,
    enableBeforeUnload: () => isDirty && router.state.status !== 'pending',
  })

  // Provide safe wrappers that handle undefined
  const proceed = useCallback(() => {
    blocker.proceed?.()
  }, [blocker])

  const reset = useCallback(() => {
    blocker.reset?.()
  }, [blocker])

  return {
    status: blocker.status,
    proceed,
    reset,
  }
}
