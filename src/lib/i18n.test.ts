import { describe, expect, it } from 'vitest'

import { initI18n } from './i18n'

describe('i18n Initialization', () => {
  it('should initialize with default language and translate a key', async () => {
    const i18n = await initI18n('en')
    expect(i18n.language).toBe('en')
    expect(i18n.t('Home')).toBe('Home')
  })

  it('should switch language and translate correctly', async () => {
    const i18n = await initI18n('en')
    await i18n.changeLanguage('fr')
    expect(i18n.language).toBe('fr')
    expect(i18n.t('Home')).toBe('Accueil')
  })

  it('should handle Indonesian (id) translations', async () => {
    const i18n = await initI18n('id')
    expect(i18n.language).toBe('id')
    expect(i18n.t('Home')).toBe('Beranda')
  })
})
