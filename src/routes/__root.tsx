import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useParams,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { Toaster } from 'sonner'

import { Navbar } from '../components/layout/Navbar'
import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface RouterContext {
  queryClient: QueryClient
}

const RootDocument = ({ children }: { children: React.ReactNode }) => {
  const { lang } = useParams({ strict: false }) as { lang?: string }
  const currentLang = lang || 'en'

  return (
    <html lang={currentLang}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
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

const RootComponent = () => {
  const { queryClient } = Route.useRouteContext()
  const routerState = useRouterState()
  const isAdminRoute = routerState.location.pathname.startsWith('/admin')
  const isCheckoutRoute = routerState.location.pathname.includes('/checkout')

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col h-full">
        {!isAdminRoute && !isCheckoutRoute && <Navbar />}
        <Outlet />
        <Toaster richColors position="top-right" />
      </div>
    </QueryClientProvider>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
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

  component: RootComponent,
  shellComponent: RootDocument,
})
