import { createFileRoute } from '@tanstack/react-router'

import { getGoogleAuthUrl } from '../../../../features/auth/lib/google-oauth'

export const Route = createFileRoute('/api/auth/google/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        let returnUrl = url.searchParams.get('returnUrl') || '/en/account'

        // Prevent open redirect - must be relative path starting with /
        // but not // (which would be protocol-relative URL)
        if (!returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
          returnUrl = '/en/account'
        }

        const googleUrl = getGoogleAuthUrl(returnUrl)
        return Response.redirect(googleUrl)
      },
    },
  },
})
