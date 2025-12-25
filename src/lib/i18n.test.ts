import { describe, expect, it } from 'vitest'

import i18n, { changeLanguage } from './i18n'

describe('i18n', () => {
  it('should initialize with default language (en)', () => {
    expect(i18n.language).toBe('en')
    expect(i18n.t('Home')).toBe('Home')
  })

  it('should switch language and translate correctly', () => {
    changeLanguage('fr')
    expect(i18n.language).toBe('fr')
    expect(i18n.t('Home')).toBe('Accueil')
  })

  it('should handle Indonesian (id) translations', () => {
    changeLanguage('id')
    expect(i18n.language).toBe('id')
    expect(i18n.t('Home')).toBe('Beranda')
  })
})
