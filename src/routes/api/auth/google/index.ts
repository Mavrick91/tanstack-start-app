import { createFileRoute } from '@tanstack/react-router'

import { getGoogleAuthUrl } from '../../../../features/auth/lib/google-oauth'

export const Route = createFileRoute('/api/auth/google/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const returnUrl = url.searchParams.get('returnUrl') || '/en/account'

        const googleUrl = getGoogleAuthUrl(returnUrl)
        return Response.redirect(googleUrl)
      },
    },
  },
})
