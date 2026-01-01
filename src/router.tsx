import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a stable QueryClient for SSR
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  })

// Create a new router instance
export const getRouter = () => {
  const queryClient = createQueryClient()

  const router = createRouter({
    routeTree,
    context: { queryClient },

    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}

// Type augmentation for router context
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
