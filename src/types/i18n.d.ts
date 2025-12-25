import 'i18next'
import en from '../i18n/locales/en.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof en
    }
    // Allow passing general strings for dynamic content while keeping autocompletion for literals
    allowObjectInt(): true
    returnNull: false
  }
}
