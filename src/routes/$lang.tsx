import { Outlet, createFileRoute, notFound } from '@tanstack/react-router'
import { useEffect } from 'react'

import { initI18n } from '../lib/i18n'

export const Route = createFileRoute('/$lang')({
  beforeLoad: ({ params }) => {
    const supportedLangs = ['en', 'fr', 'id']
    if (!supportedLangs.includes(params.lang)) {
      throw notFound()
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { lang } = Route.useParams()

  useEffect(() => {
    initI18n(lang)
  }, [lang])

  return <Outlet />
}
