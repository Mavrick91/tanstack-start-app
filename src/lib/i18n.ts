import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '../i18n/locales/en.json'
import fr from '../i18n/locales/fr.json'
import id from '../i18n/locales/id.json'

const resources = {
  en: { common: en },
  fr: { common: fr },
  id: { common: id },
}

export type TranslationKey = keyof typeof en

// Initialize synchronously with a default language
i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
})

export const changeLanguage = (lang: string) => {
  if (i18n.language !== lang) {
    i18n.changeLanguage(lang)
  }
}

export default i18n
