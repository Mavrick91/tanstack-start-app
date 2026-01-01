import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'

import { changeLanguage } from '../lib/i18n'

const RouteComponent = () => {
  return <Outlet />
}

export const Route = createFileRoute('/$lang')({
  beforeLoad: ({ params }) => {
    const supportedLangs = ['en', 'fr', 'id']
    if (!supportedLangs.includes(params.lang)) {
      throw notFound()
    }
    // Change language synchronously before rendering
    changeLanguage(params.lang)
  },
  component: RouteComponent,
})
