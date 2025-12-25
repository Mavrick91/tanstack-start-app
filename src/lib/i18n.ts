import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
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

export const initI18n = async (initialLang = 'en') => {
  await i18n
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
      resources,
      lng: initialLang,
      fallbackLng: 'en',
      defaultNS: 'common',
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['path', 'cookie', 'localStorage', 'navigator'],
        lookupFromPathIndex: 0,
      },
    })

  return i18n
}

export default i18n
