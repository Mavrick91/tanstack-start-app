import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  HeadContent,
  Scripts,
  createRootRoute,
  useParams,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { useState } from 'react'
import { Toaster } from 'sonner'

import { Navbar } from '../components/layout/Navbar'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'FineNail Season | Premium Nail Art & Manicure',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { lang } = useParams({ strict: false }) as { lang?: string }
  const currentLang = lang || 'en'
  const routerState = useRouterState()
  const isAdminRoute = routerState.location.pathname.startsWith('/admin')
  const isCheckoutRoute = routerState.location.pathname.includes('/checkout')

  // Create QueryClient once per app instance
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <html lang={currentLang}>
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="min-h-screen flex flex-col h-full">
          <QueryClientProvider client={queryClient}>
            {!isAdminRoute && !isCheckoutRoute && <Navbar />}
            {children}
            <Toaster richColors position="top-right" />
          </QueryClientProvider>
        </div>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
