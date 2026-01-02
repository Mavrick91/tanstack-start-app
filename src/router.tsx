import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { DefaultErrorComponent } from './components/ui/error-boundary'
// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a stable QueryClient for SSR
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

// Default pending component for route transitions
const DefaultPendingComponent = () => (
  <div className="min-h-[200px] flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
)

// Create a new router instance
export const getRouter = () => {
  const queryClient = createQueryClient()

  const router = createRouter({
    routeTree,
    context: { queryClient },

    scrollRestoration: true,
    defaultPreloadStaleTime: 0,

    // Global error handling
    defaultErrorComponent: DefaultErrorComponent,

    // Global pending state during navigation
    defaultPendingComponent: DefaultPendingComponent,
    defaultPendingMinMs: 200, // Avoid flash for fast transitions
  })

  return router
}

// Type augmentation for router context
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
