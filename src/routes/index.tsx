import { createFileRoute, redirect } from '@tanstack/react-router'

import i18n from '../lib/i18n'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const detectedLang = i18n.language?.split('-')[0] || 'en'
    const lang = ['en', 'fr', 'id'].includes(detectedLang) ? detectedLang : 'en'

    throw redirect({
      to: '/$lang',
      params: { lang },
    })
  },
})
