import { type Page, type Locator } from '@playwright/test'

export class ProductPage {
  readonly page: Page
  readonly addToCartButton: Locator
  readonly quantityDisplay: Locator
  readonly increaseQuantityButton: Locator
  readonly decreaseQuantityButton: Locator

  constructor(page: Page) {
    this.page = page
    this.addToCartButton = page.locator('button:has-text("Add to Bag")')
    this.quantityDisplay = page.locator('.w-12.text-center')
    this.increaseQuantityButton = page.locator('button:has(svg.lucide-plus)')
    this.decreaseQuantityButton = page.locator('button:has(svg.lucide-minus)')
  }

  async goto(productSlug: string, lang = 'en') {
    await this.page.goto(`/${lang}/products/${productSlug}`)
    await this.page.waitForLoadState('networkidle')
  }

  async selectVariantIfPresent(optionName: string, value: string) {
    const variantSelector = this.page.locator(`[data-option="${optionName}"]`)
    if (await variantSelector.isVisible()) {
      await variantSelector.locator(`button:has-text("${value}")`).click()
    }
  }

  async setQuantity(quantity: number) {
    const currentQty = parseInt(
      (await this.quantityDisplay.textContent()) || '1',
    )
    const diff = quantity - currentQty

    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        await this.increaseQuantityButton.click()
      }
    } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff); i++) {
        await this.decreaseQuantityButton.click()
      }
    }
  }

  async addToCart() {
    await this.addToCartButton.click()
    await this.page.waitForTimeout(500)
  }
}
